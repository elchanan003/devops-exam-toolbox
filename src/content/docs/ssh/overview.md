---
title: SSH — מפתחות ו-GitLab
description: ליצור key, לרשום את ה-.pub ב-GitLab, להגדיר ~/.ssh/config, לבדוק עם ssh -T ו-ssh -v, ולהבין authn מול authz.
sidebar:
  order: 1
---

:::note[בקצרה]
ה-private key נשאר אצלך, ה-`.pub` נרשם ב-GitLab, והלקוח (אתה, לא השרת) בוחר איזה key להציג. הדף מכסה: יצירה, רישום, config, בדיקה,
פענוח שגיאות, clone ב-HTTPS עם token, ורשימת בדיקה ל-VM חדשה. השימוש ב-Git עצמו: [git](../../git/overview/).
:::

## ליצור key חדש (ssh-keygen)

```bash title="runs on: any shell"
mkdir -p -m 700 ~/.ssh
ssh-keygen -t ed25519 -f <FILE> -C "exam-vm" -N ""
# TRIDENT: ssh-keygen -t ed25519 -f ~/.ssh/exam_key -C "exam-vm" -N ""
```

`-t ed25519` סוג המפתח, `-f` הנתיב המלא של הקובץ הפרטי (ייווצר גם `<FILE>.pub`), `-C` הערה (תווית), `-N ""` בלי passphrase.
התיקייה חייבת להיות קיימת לפני: עם `-f` מותאם `ssh-keygen` לא יוצר אותה (`No such file or directory`). אם הקובץ כבר קיים הוא ישאל `Overwrite (y/n)?`: ענה `n`, כדי לא לדרוס key שכבר רשום.

**איך מוודאים:** `ls -l ~/.ssh` מציג קובץ פרטי עם `-rw-------` (600) ו-`.pub` עם `-rw-r--r--`.

## לרשום את ה-.pub ב-GitLab

מדפיסים את ה-**ציבורי** (`.pub`) ומדביקים. את הפרטי לעולם לא.

```bash title="runs on: any shell"
cat <FILE>.pub
```

```text title="GitLab UI"
User Settings → SSH Keys → Add new key
Key: paste the whole line (starts with ssh-ed25519 ...)
Title: any label, e.g. exam-vm → Add key
```

:::caution[מלכודת · קרה בתרגול]
`cat id_ed25519_gitlab.pub` עם שם יחסי עובד רק מתוך `~/.ssh`. תמיד נתיב מלא: `cat ~/.ssh/exam_key.pub`.
:::

אם מישהו גנב את ה-`.pub` הוא **לא** יכול לדחוף: הוא רק "מנעול". החתימה נוצרת על ידי המפתח הפרטי בזמן ההתחברות.

**איך מוודאים:** המפתח מופיע ברשימה ב-GitLab עם fingerprint (ראה [fingerprint](#להשוות-key-מקומי-ל-gitlab-לפי-fingerprint)).

## לבדוק חיבור: ssh -T

```bash title="runs on: any shell"
ssh -T git@<GITLAB_HOST>
# TRIDENT: ssh -T git@gitlab.com
```

בפעם הראשונה תישאל `Are you sure you want to continue connecting?` ← `yes` (נשמר ב-`~/.ssh/known_hosts`).

**איך מוודאים:** `Welcome to GitLab, @<USER>!`. לפני רישום ה-key מקבלים `Permission denied (publickey)`. כדאי לראות את זה פעם אחת, כדי לדעת שהבדיקה באמת בודקת.

:::caution[מלכודת · קרה בתרגול]
`Welcome to GitLab` = **authentication** בלבד (GitLab יודע מי אתה). זה **לא** אומר שיש לך הרשאה על ה-project. ה-key הישן ב-config אימת בהצלחה, ובכל זאת `git clone` של gitops נכשל ב-`project could not be found or you don't have permission`.
:::

## ליצור ~/.ssh/config ו-IdentitiesOnly

ברירות מחדל: ssh מנסה אוטומטית שמות כמו `id_ed25519` ו-`id_rsa`. **config נדרש רק** כשהשם מותאם או כשיש כמה keys.

```ini title="file: ~/.ssh/config"
Host <GITLAB_HOST>
  User git
  IdentityFile <FILE>
  IdentitiesOnly yes
```

`IdentitiesOnly yes` אומר להציג **רק** את ה-key שבשורת `IdentityFile`, ולא כל key מה-agent או מהשמות הרגילים (שגורם ל-`Too many authentication failures` או להתחברות בזהות שגויה).

```bash title="runs on: any shell"
chmod 600 ~/.ssh/config
ssh -G <GITLAB_HOST> | grep -iE '^(user|identityfile|identitiesonly) '
```

**איך מוודאים:** `ssh -G` (מדפיס את ההגדרות האפקטיביות בלי להתחבר) מציג `identityfile <FILE>` ו-`identitiesonly yes`. בלי config עם שם מותאם הוא מציג רק את שמות ברירת המחדל, וה-clone ייכשל.

## לבדוק על מכונה "נקייה": -F /dev/null

מדמה VM בלי config: מתעלם מהקובץ ובודק שה-key עובד כשנותנים אותו במפורש.

```bash title="runs on: any shell"
ssh -F /dev/null -i <FILE> -o IdentitiesOnly=yes -T git@<GITLAB_HOST>
```

**איך מוודאים:** `Welcome to GitLab, @<USER>!`. עבד כאן אבל `git clone` נכשל? ה-config האמיתי מצביע על key אחר: ראה הבא.

## git clone נכשל אבל ssh -T עובד

:::caution[מלכודת · קרה בתרגול]
`git clone` רגיל משתמש ב-`~/.ssh/config` שלך. ה-config הצביע על key **ישן** שמאמת אבל אין לו גישה ל-group החדש. `GIT_SSH_COMMAND` עם ה-key החדש עבד, ואחרי עריכת `IdentityFile` בקובץ ה-clone הצליח.
:::

לאבחון, להכריח key ספציפי רק לפקודה אחת:

```bash title="runs on: any shell"
GIT_SSH_COMMAND='ssh -i <FILE> -o IdentitiesOnly=yes' git ls-remote git@<GITLAB_HOST>:<GROUP>/<REPO>.git
```

אם זה עובד, הבעיה ב-config (ה-key שנבחר). אם גם זה נכשל, ה-key תקין אבל המשתמש לא חבר ב-project.

סיבות ל-"Welcome אבל ה-clone לא נמצא":

| סיבה | בדיקה |
|---|---|
| URL/path שגוי | להעתיק מ-Code ← Clone with SSH (path של ה-group, לא שם תצוגה) |
| זהות שגויה ב-config | `ssh -G <GITLAB_HOST>` ו-`ssh -v` |
| ה-key נכון, המשתמש לא חבר ב-project / בלי role | ה-project ב-GitLab ← Members (שכבת authorization) |

## Permission denied (publickey): מה בודקים

הסדר:

```bash title="runs on: any shell"
ls -l ~/.ssh
ssh -G <GITLAB_HOST> | grep -i identityfile
ssh-keygen -lf <FILE>.pub
ssh -v -T git@<GITLAB_HOST>
```

1. קיים key ב-`~/.ssh`, ושם הקובץ זהה לזה ש-config מצביע עליו.
2. ה-`.pub` רשום ב-GitLab (השוואת fingerprint, למטה).
3. הרשאות: תיקייה 700, מפתח פרטי ו-config 600.
4. `ssh -v` מראה אילו keys הוצעו.

```bash title="runs on: any shell"
chmod 700 ~/.ssh
chmod 600 <FILE> ~/.ssh/config
chmod 644 <FILE>.pub
```

ssh מסרב להשתמש במפתח פרטי שפתוח לאחרים (`UNPROTECTED PRIVATE KEY FILE`). `ssh-keygen` יוצר 600 לבד, כך שזו בדיקת תקלות ולא צעד שגרתי.

**איך מוודאים:** `stat -c '%a %n' ~/.ssh <FILE> ~/.ssh/config` מציג `700`, `600`, `600`.

## לקרוא את ssh -v: אילו keys הוצעו

```bash title="runs on: any shell"
ssh -v -T git@<GITLAB_HOST> 2>&1 | grep -iE 'identity file|offering|authenticated|denied'
```

שורות `Offering public key: <path>` מראות מה הלקוח הציע. `Authenticated to ...` = הצליח. אם הנתיב הצפוי לא מופיע, config לא נקרא או שם ה-Host לא תואם בדיוק (`Host gitlab.com` מול `git@gitlab.com`).

## להשוות key מקומי ל-GitLab לפי fingerprint

GitLab מציג fingerprint בפורמט `SHA256:...` ברשימת ה-keys. מחשבים את אותו דבר מקומית:

```bash title="runs on: any shell"
ssh-keygen -lf <FILE>.pub
ssh-keygen -y -f <FILE> | ssh-keygen -lf -
```

הפקודה השנייה גוזרת את ה-public מתוך הפרטי, כדי לוודא שהזוג תואם. אם ה-fingerprint לא מופיע ב-GitLab, ה-key הזה לא רשום (או שרשום המפתח הלא נכון).

**איך מוודאים:** `256 SHA256:<hash> <comment> (ED25519)` זהה למה ש-GitLab מציג.

## לנקות known_hosts כשהשרת השתנה

הסימפטום: `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!`.

```bash title="runs on: any shell"
ssh-keygen -F <GITLAB_HOST>
ssh-keygen -R <GITLAB_HOST>
```

`-F` מחפש את הרשומה, `-R` מוחק אותה (תישאל `yes` מחדש בחיבור הבא). רק אם אתה בטוח שהשינוי לגיטימי.

## clone ב-HTTPS עם token (oauth2)

כש-SSH לא זמין (CI, Argo, VM בלי key): כתובת HTTPS עם משתמש `oauth2` והסיסמה היא ה-token.

```bash title="runs on: any shell"
read -rs GIT_TOKEN
git clone "https://oauth2:${GIT_TOKEN}@<GITLAB_HOST>/<GROUP>/<REPO>.git"
git -C <REPO> remote set-url origin "https://<GITLAB_HOST>/<GROUP>/<REPO>.git"
unset GIT_TOKEN
```

`read -rs` קורא בלי להציג. ה-token נכתב ל-`.git/config` של ה-clone, לכן `set-url` מסיר אותו. לעולם לא מדביקים token לתוך הפקודה (היסטוריית shell). ב-pipeline המשתנה בא מ-GitLab: `https://oauth2:${TRIDENT_GIT_TOKEN}@...`.

**איך מוודאים:** `git -C <REPO> remote -v` מציג כתובת בלי token, ו-`git -C <REPO> log --oneline -1` עובד.

מי צריך איזה token ובאיזה scope: [gitlab/identities](../../gitlab/identities/).

## צ'קליסט: VM חדשה, מאפס ועד clone

```bash title="runs on: any shell"
mkdir -p -m 700 ~/.ssh
ssh-keygen -t ed25519 -f <FILE> -C "exam-vm" -N ""
cat <FILE>.pub
ssh -F /dev/null -i <FILE> -o IdentitiesOnly=yes -T git@<GITLAB_HOST>
git clone git@<GITLAB_HOST>:<GROUP>/<REPO>.git
```

1. `mkdir` + `ssh-keygen` (נתיב מלא ב-`-f`).
2. הדבקת ה-`.pub` ב-GitLab (SSH Keys).
3. `ssh -T` עם `-F /dev/null` ← `Welcome` (+ `yes` ל-known_hosts).
4. אם השם מותאם: `~/.ssh/config` עם `IdentitiesOnly yes`, `chmod 600`.
5. `git clone`, ואז `git config --global user.name` / `user.email` ([git](../../git/overview/)).

**איך מוודאים:** `ls <REPO>` מציג קבצים, ו-`git -C <REPO> log --oneline -1` מראה commit.

:::tip[עיקרון]
שתי שכבות עצמאיות: **authentication** (ה-key מוכר ל-GitLab: `Welcome`) ו-**authorization** (ל-user יש role ב-project). בשגיאה, קודם קבע באיזו שכבה היא.
:::
