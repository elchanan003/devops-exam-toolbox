---
title: ארגז כלים — פקודות shell לאבחון
description: טבלה וקטעי קוד קצרים של פקודות bash שחוזרים בכל תרגיל, מ-set -x ועד jq, grep, sed, awk ו-curl.
sidebar:
  order: 2.5
---

:::note[בקצרה]
פקודות קטנות שמשתמשים בהן כל הזמן כדי לבדוק, לחתוך ולהשוות. כל השורות נבדקו. scripts שלמים: [templates](../templates/). מושגי יסוד: [overview](../overview/).
:::

## לעקוב אחרי script שנכשל

```bash title="runs on: any shell"
bash -x script.sh                                        # prints every command before running it
set -x                                                   # inside a script: start tracing (set +x stops)
trap 'echo "failed at line $LINENO"' ERR                 # put under set -e: names the failing line
kubectl get ns nope; echo "rc=$?"                        # $? must be read on the very next line
```

**איך מוודאים:** `trap` מדפיס `failed at line 5` והמספר הוא השורה ב-script. `$?` מתאפס אחרי **כל** פקודה, אפילו `echo`.

## בדיקות: קובץ, פקודה, תנאי

| רוצה לדעת | כתוב |
|---|---|
| הפקודה קיימת? | `command -v kubectl >/dev/null \|\| echo missing` |
| קובץ רגיל / תיקייה | `test -f <FILE>` / `test -d <DIR>` |
| קובץ **לא ריק** / קריא | `test -s <FILE>` / `test -r <FILE>` |
| כמה תנאים יחד | `[[ -f <FILE> && "$X" == dev* ]]` |

`[[ ]]` הוא של bash: מרכאות לא חובה, תומך ב-`&&`, `||`, ו-`==` עם תבנית. `[ ]` הוא `test` הישן: שם חייבים מרכאות סביב משתנים ו-`-a`/`-o` במקום `&&`/`||`.

## לחפש ולחתוך טקסט

```bash title="runs on: any shell"
grep -q 'text' <FILE> && echo found      # -q: no output, only exit code
grep -c 'text' <FILE>                    # count matching lines
grep -n 'text' <FILE>                    # with line numbers
grep -E '^(dev|prod):' <FILE>            # extended regex (alternation)
grep -F 'a.b[0]' <FILE>                  # literal string, no regex
sed -n '10,20p' <FILE>                   # print lines 10 to 20 only
awk '{print $1}' <FILE>                  # first whitespace-separated column
cut -d: -f1 /etc/passwd                  # first field split by ':'
kubectl get pods -o name | xargs -n1 echo  # one argument per command run
```

**איך מוודאים:** `grep -q` מחזיר exit 0 כשנמצא ו-1 כשלא. `grep -c` תמיד מדפיס מספר (גם `0`).

## לשמור, להשוות, לפענח

```bash title="runs on: any shell"
helm template <RELEASE> <CHART_DIR> | tee /tmp/render.yaml | grep -c 'kind:'   # save AND pipe on (-a appends)
diff <(grep image: a.yaml) <(grep image: b.yaml)                                # compare two outputs, no temp files
echo -n '<BASE64>' | base64 -d                                                  # decode (-n: no newline added)
curl -s http://<HOST>/info | jq -r '.version'                                   # -r: raw string, no quotes
TAG="dev-$(date -u +%Y%m%d)"                                                    # e.g. dev-20261004
cat -A <FILE>                                                                   # ^M = CRLF, $ = line end, spaces visible
```

`diff` יוצא עם 1 כשיש הבדל ו-0 כשאין. ב-`cat -A`: `^M$` בסוף שורה = CRLF ([תיקון](../overview/#sed--i-sr--תיקון-crlf)); רווח לפני `$` = רווח מיותר.

## curl: לבדוק שירות

```bash title="runs on: any shell"
curl -fsS http://<HOST>/ready                                         # -f fail on HTTP error, -sS quiet but show errors
curl -s -o /dev/null -w '%{http_code}\n' http://<HOST>/ready          # only the status code
curl -k --resolve <HOST>:<PORT>:<VM_IP> https://<HOST>:<PORT>/info    # TLS via NodePort without /etc/hosts
```

**איך מוודאים:** `200` ב-`http_code`. `000` = לא היה חיבור בכלל (DNS/פורט), לא שגיאת HTTP. עוד: [kubernetes/networking](../../kubernetes/networking/).
