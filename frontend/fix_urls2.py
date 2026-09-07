import os
import glob
import re

base_dir = r"d:\student-manager\frontend\src\components"

for filepath in glob.glob(os.path.join(base_dir, "*.jsx")):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace trailing single quotes with backticks if the string starts with `${
    content = re.sub(r"(\$\{import\.meta\.env\.VITE_API_URL.*?\}[^']*?)'", r"\1`", content)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
