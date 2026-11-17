#!/usr/bin/env python3
"""Lit le site d'une entreprise et en sort ce dont Batman a besoin pour prospecter.

Usage :
    python3 scripts/prospect/scan_site.py https://www.exemple.fr [autre-site.com ...]

Pour chaque site, le script lit la page d'accueil puis jusqu'à 8 pages utiles
(contact, mentions légales, à propos, actualités...) et renvoie en JSON :
  - emails : les adresses publiées sur le site, avec la page où elles figurent
    et leur type (« domaine » = même domaine que le site, « webmail » = gmail,
    outlook..., « autre ») ;
  - reseaux : liens Instagram, TikTok, Facebook, LinkedIn, YouTube ;
  - videos : le site contient-il déjà des vidéos (balise <video>, YouTube, Vimeo) ;
  - signaux : phrases récentes qui peuvent justifier un contact (ouverture,
    lancement, nouvelle collection, événement, 2026...), avec la page source.

Aucune adresse n'est devinée : seules les adresses écrites sur le site sortent.
Bibliothèque standard uniquement (pas de dépendance).
"""
import html
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
TIMEOUT = 20
MAX_PAGES = 9

USEFUL_LINK = re.compile(
    r"contact|mentions|legal|l%C3%A9gal|a-propos|apropos|about|qui-sommes|notre-histoire|equipe|team|"
    r"actualit|news|blog|presse|press|evenement|events?|agenda|nouveaut|collection|impressum|infos",
    re.I,
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}")
OBFUSCATED_RE = re.compile(
    r"([A-Za-z0-9._%+\-]+)\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+arobase\s+|\s+at\s+)\s*"
    r"([A-Za-z0-9\-]+)\s*(?:\[\s*(?:dot|point)\s*\]|\(\s*(?:dot|point)\s*\)|\s+(?:dot|point)\s+|\.)\s*([A-Za-z]{2,24})",
    re.I,
)
WEBMAIL = {
    "gmail.com", "googlemail.com", "outlook.fr", "outlook.com", "hotmail.fr", "hotmail.com",
    "live.fr", "live.com", "yahoo.fr", "yahoo.com", "orange.fr", "wanadoo.fr", "free.fr",
    "sfr.fr", "laposte.net", "icloud.com", "me.com", "aol.com", "aol.fr", "neuf.fr", "bbox.fr",
}
JUNK = re.compile(
    r"(example|exemple|domain|votre|your|email@|nom@|name@|user@|sentry|wixpress|"
    r"\.(png|jpe?g|gif|svg|webp|css|js)$|@2x|noreply|no-reply|donotreply)",
    re.I,
)
SOCIAL = {
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/[A-Za-z0-9_.]+", re.I),
    "tiktok": re.compile(r"https?://(?:www\.)?tiktok\.com/@[A-Za-z0-9_.]+", re.I),
    "facebook": re.compile(r"https?://(?:www\.|fr-fr\.)?facebook\.com/[A-Za-z0-9_.\-]+", re.I),
    "linkedin": re.compile(r"https?://(?:[a-z]{2}\.|www\.)?linkedin\.com/(?:company|in)/[A-Za-z0-9_\-%]+", re.I),
    "youtube": re.compile(r"https?://(?:www\.)?youtube\.com/(?:@|channel/|c/|user/)[A-Za-z0-9_\-]+", re.I),
}
SOCIAL_SKIP = re.compile(r"/(sharer|share|intent|plugins|tr|dialog|p|reel|watch|embed|profile\.php)(/|\?|$)", re.I)
SIGNAL_RE = re.compile(
    r"\b(ouverture|ouvre|ouvrira|inaugur\w*|nouveau|nouvelle|nouveaut\w*|lancement|lance|lancer|"
    r"collection|capsule|édition|edition|événement|evenement|salon|festival|vernissage|exposition|"
    r"noël|noel|fêtes|fetes|black friday|rénov\w*|renov\w*|recrut\w*|déménag\w*|anniversaire|"
    r"opening|launch\w*|new|now open|event)\b",
    re.I,
)
DATE_RE = re.compile(r"\b(2026|2027|novembre|décembre|decembre|janvier|november|december|january)\b", re.I)


def _ssl_context():
    ctx = ssl.create_default_context()
    bundle = "/root/.ccr/ca-bundle.crt"
    if os.path.exists(bundle):
        ctx.load_verify_locations(bundle)
    return ctx


CTX = _ssl_context()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as resp:
        final = resp.geturl()
        ctype = resp.headers.get("Content-Type", "")
        if "html" not in ctype and "text" not in ctype:
            return final, ""
        raw = resp.read(3_000_000)
        charset = resp.headers.get_content_charset() or "utf-8"
        return final, raw.decode(charset, errors="replace")


def decode_cfemail(hexstr):
    try:
        key = int(hexstr[:2], 16)
        return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))
    except ValueError:
        return ""


def visible_text(page):
    page = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", page)
    page = re.sub(r"(?s)<[^>]+>", " ", page)
    return re.sub(r"\s+", " ", html.unescape(page)).strip()


def base_domain(host):
    host = host.lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    parts = host.split(".")
    if len(parts) > 2 and parts[-2] in {"co", "com", "org", "net"} and len(parts[-1]) == 2:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def find_emails(page):
    found = set()
    for m in re.finditer(r'data-cfemail="([0-9a-fA-F]+)"', page):
        found.add(decode_cfemail(m.group(1)))
    for m in re.finditer(r"mailto:([^\"'?>\s]+)", page, re.I):
        found.add(urllib.parse.unquote(html.unescape(m.group(1))))
    text = html.unescape(page)
    found.update(EMAIL_RE.findall(text))
    for m in OBFUSCATED_RE.finditer(visible_text(page)):
        found.add(f"{m.group(1)}@{m.group(2)}.{m.group(3)}")
    clean = set()
    for e in found:
        e = e.strip().strip(".,;:").lower()
        if EMAIL_RE.fullmatch(e) and not JUNK.search(e):
            clean.add(e)
    return clean


def find_signals(text, url):
    out = []
    for sentence in re.split(r"(?<=[.!?])\s+|\s{2,}|\s[•|·]\s", text):
        s = sentence.strip()
        if 25 <= len(s) <= 260 and SIGNAL_RE.search(s) and DATE_RE.search(s):
            out.append({"texte": s, "page": url})
    return out


def scan(start):
    if not re.match(r"https?://", start):
        start = "https://" + start
    result = {"site": start, "domaine": None, "pages_lues": [], "emails": [], "reseaux": {},
              "videos": False, "signaux": [], "erreurs": []}
    try:
        home_url, home = fetch(start)
    except Exception as exc:  # noqa: BLE001
        if start.startswith("https://"):
            try:
                home_url, home = fetch("http://" + start[len("https://"):])
            except Exception as exc2:  # noqa: BLE001
                result["erreurs"].append(f"{start}: {exc2}")
                return result
        else:
            result["erreurs"].append(f"{start}: {exc}")
            return result
    host = urllib.parse.urlparse(home_url).netloc
    domain = base_domain(host)
    result["domaine"] = domain

    queue, seen = [home_url], set()
    pages = {home_url: home}
    for href in re.findall(r'href="([^"#]+)"', home, re.I):
        absu = urllib.parse.urljoin(home_url, html.unescape(href))
        p = urllib.parse.urlparse(absu)
        if p.scheme.startswith("http") and base_domain(p.netloc) == domain and USEFUL_LINK.search(p.path):
            if absu not in queue:
                queue.append(absu)
    emails, signals = {}, []
    for url in queue:
        if len(seen) >= MAX_PAGES:
            break
        if url in seen:
            continue
        seen.add(url)
        page = pages.get(url)
        if page is None:
            time.sleep(0.8)  # politesse : évite les erreurs 429
            try:
                url, page = fetch(url)
            except Exception as exc:  # noqa: BLE001
                result["erreurs"].append(f"{url}: {exc}")
                continue
        result["pages_lues"].append(url)
        for e in find_emails(page):
            emails.setdefault(e, url)
        for name, rx in SOCIAL.items():
            for link in rx.findall(page):
                if not SOCIAL_SKIP.search(urllib.parse.urlparse(link).path):
                    result["reseaux"].setdefault(name, link.rstrip("/"))
        if re.search(r"<video|youtube\.com/embed|player\.vimeo\.com|youtu\.be/", page, re.I):
            result["videos"] = True
        signals.extend(find_signals(visible_text(page), url))

    for e, url in sorted(emails.items()):
        edom = e.split("@", 1)[1]
        kind = "domaine" if base_domain(edom) == domain else ("webmail" if edom in WEBMAIL else "autre")
        result["emails"].append({"email": e, "type": kind, "page": url})
    order = {"domaine": 0, "webmail": 1, "autre": 2}
    result["emails"].sort(key=lambda x: order[x["type"]])
    uniq, seen_txt = [], set()
    for s in signals:
        if s["texte"] not in seen_txt:
            seen_txt.add(s["texte"])
            uniq.append(s)
    result["signaux"] = uniq[:10]
    return result


def main(argv):
    if not argv:
        print(__doc__)
        return 1
    out = [scan(a) for a in argv]
    print(json.dumps(out if len(out) > 1 else out[0], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
