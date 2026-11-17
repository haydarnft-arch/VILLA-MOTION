#!/usr/bin/env python3
"""Vérifie une entreprise française dans l'annuaire officiel (recherche-entreprises.api.gouv.fr).

Usage :
    python3 scripts/prospect/entreprise.py "Nom de l'entreprise" [code_postal]

Affiche pour les 3 meilleurs résultats : nom, SIREN, date de création, code
d'activité (NAF), adresse du siège, état (A = active, C = cessée).
Sert à Batman à confirmer qu'il s'agit bien d'un professionnel actif, et à
repérer les créations récentes (signal « vient d'ouvrir »).
API publique et gratuite, sans clé.
"""
import json
import os
import ssl
import sys
import time
import urllib.parse
import urllib.request

API = "https://recherche-entreprises.api.gouv.fr/search"


def main(argv):
    if not argv:
        print(__doc__)
        return 1
    params = {"q": argv[0], "per_page": 3}
    if len(argv) > 1:
        params["code_postal"] = argv[1]
    url = API + "?" + urllib.parse.urlencode(params)
    ctx = ssl.create_default_context()
    if os.path.exists("/root/.ccr/ca-bundle.crt"):
        ctx.load_verify_locations("/root/.ccr/ca-bundle.crt")
    data = None
    for attempt in range(4):  # l'API limite le nombre d'appels par seconde
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "prospect-check"}),
                                        timeout=20, context=ctx) as resp:
                data = json.load(resp)
            if "results" in data:
                break
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1.5 * (attempt + 1))
    if not data or "results" not in data:
        print("Annuaire indisponible, réessayer plus tard.")
        return 2
    out = []
    for r in data["results"]:
        s = r.get("siege") or {}
        out.append({
            "nom": r.get("nom_complet"),
            "siren": r.get("siren"),
            "creation": s.get("date_creation") or r.get("date_creation"),
            "naf": s.get("activite_principale"),
            "adresse": s.get("adresse"),
            "etat": s.get("etat_administratif"),
        })
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
