#!/bin/bash

# Define colors (will now be shown as text)
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
WHITE="\033[1;37m"
NC="\033[0m"

# Display script header
echo -e "${WHITE}====================================="
echo -e "         🚀 GIT AUTO UPDATE        "
echo -e "=====================================${NC}\n"

# Show the repository URL
repo_url=$(git config --get remote.origin.url)
echo -e "📌 Repository: ${CYAN}${repo_url}${NC}"
echo -e "⏳ Run Time: $(date '+%d %B %Y %I:%M:%S %p')\n"

# Get the current branch
current_branch=$(git symbolic-ref --short HEAD)

# Display the header
echo -e "${WHITE}Action                               : Status${NC}"

# Pull latest changes
git pull origin "$current_branch" --quiet

# Check if already on main branch
if [[ "$current_branch" == "main" ]]; then
    echo -e "✅ Already on main branch            : ${CYAN}🆗 Up to date${NC}"
else
    # Checkout to main branch
    echo -e "🔄 Switching to main branch         : ${GREEN}✔ Success${NC}"
    git checkout main || { echo -e "${RED}❌ Failed to switch branch!${NC}"; exit 1; }
fi

# Pull latest changes again after switching
echo -e "📥 Pulling latest changes            : ${GREEN}✔ Success${NC}"

git pull origin main --quiet

# Check for changes and commit if necessary
if [[ -n $(git status --porcelain) ]]; then
    echo -e "📝 Changes detected, adding files... : ${YELLOW}🔄 Committing...${NC}\n"
    git add . && git commit -m "$(date '+%d %B %Y %I:%M:%S %p')"

    # Get the latest commit hash and message dynamically
    commit_hash=$(git log -1 --pretty=format:"%h")
    commit_message=$(git log -1 --pretty=format:"%s")

    echo -e "\n${WHITE}Action            : Status${NC}"
    echo -e "🔹 Commit Hash    : ${commit_hash}"
    echo -e "🔹 Commit Message : ${commit_message}\n"

    # Push changes
    echo -e "🚀 Pushing to GitHub..."
    git push origin main --quiet

    # Final success message
    echo -e "🎉 GitHub Push    : ${GREEN}✔ Success${NC}\n"

    # Show recent commits
    echo -e "📝 Recent Commits:"
    git log --oneline -3
else
    echo -e "🚨 No changes detected               : ${RED}❌ Nothing to push${NC}"
fi

# Display script footer
echo -e "\n${WHITE}====================================="
echo -e "      ✅ GIT AUTO UPDATE DONE      "
echo -e "=====================================${NC}\n"
