# Deploy changes to remote repository
deploy:
    git add .
    git commit -m "Update files"
    git push origin main

# Deploy with custom commit message
deploy message:
    git add .
    git commit -m "{{message}}"
    git push origin main

# Quick add and commit (no push)
commit:
    git add .
    git commit -m "Update files"

# Quick add and commit with custom message
commit message:
    git add .
    git commit -m "{{message}}"
