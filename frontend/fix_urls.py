import os
import glob
import re

base_dir = r"d:\student-manager\frontend\src\components"

for filepath in glob.glob(os.path.join(base_dir, "*.jsx")):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix the broken ones: '`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api...'
    # We want to change '`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/tasks' 
    # to `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/tasks`
    
    content = content.replace(
        "'`${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}`/api", 
        "`${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}/api"
    )
    
    content = content.replace(
        "\"`${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}`/api", 
        "`${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}/api"
    )

    # For things that were template literals already:
    # like `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/notes/${id}
    # which became `...`/api... -> we need to strip the extra backticks inside.
    content = content.replace(
        "\`${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}\`/api",
        "${import.meta.env.VITE_API_URL || \"http://127.0.0.1:5000\"}/api"
    )
    
    # Let's just do a clean regex replacement
    # We want to find any fetch pattern and ensure it's a template literal.
    
    # Wait, the simplest is replacing `'`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/` with `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/
    
    # Then change ending single quote to backtick
    content = re.sub(r"'(\$\{import\.meta\.env\.VITE_API_URL.*?})", r"`\1", content)
    # Fix the trailing quote if it started with a backtick now
    # It's easier to just write exactly the regexes
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
