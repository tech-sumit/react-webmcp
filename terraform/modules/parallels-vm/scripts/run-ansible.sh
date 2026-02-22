#!/bin/bash
###############################################################################
# run-ansible.sh -- Copy and run the OpenClaw Ansible playbook on the VM
#
# Usage: run-ansible.sh <vm_user> <vm_ssh_port> <ansible_dir>
#
# Called by the Terraform null_resource.ansible_provision local-exec.
###############################################################################
set -euo pipefail

VM_USER="${1:-parallels}"
VM_SSH_PORT="${2:-2222}"
ANSIBLE_DIR="${3}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${VM_SSH_PORT}"

echo "=== OpenClaw Ansible Provisioning ==="
echo "  VM user:    ${VM_USER}"
echo "  SSH port:   ${VM_SSH_PORT}"
echo "  Playbook:   ${ANSIBLE_DIR}"

# ---------------------------
# 1. Sync playbook to the VM
# ---------------------------
echo ""
echo "[1/2] Syncing OpenClaw Ansible playbook to VM..."
rsync -avz --delete --exclude='.git' \
  -e "ssh ${SSH_OPTS}" \
  "${ANSIBLE_DIR}/" \
  "${VM_USER}@localhost:/tmp/openclaw-ansible/"

# ---------------------------
# 2. Install Ansible and run playbook on the VM
# ---------------------------
echo ""
echo "[2/2] Running OpenClaw Ansible playbook on VM..."
ssh ${SSH_OPTS} "${VM_USER}@localhost" 'bash -s' <<'REMOTE'
set -euo pipefail

echo "--- VM: fixing broken dpkg state from Parallels clone (grub-efi)..."
# Parallels VM clones change the disk UUID/ID, which breaks grub-efi post-install scripts.
# Divert grub-multi-install to a no-op so apt dist-upgrade can proceed uninterrupted.
if [ -x /usr/lib/grub/grub-multi-install ] && ! dpkg-divert --list /usr/lib/grub/grub-multi-install | grep -q local; then
  sudo dpkg-divert --add --rename --divert /usr/lib/grub/grub-multi-install.real /usr/lib/grub/grub-multi-install
fi
echo '#!/bin/bash
echo "grub-multi-install: skipped (Parallels VM clone)"
exit 0' | sudo tee /usr/lib/grub/grub-multi-install > /dev/null
sudo chmod +x /usr/lib/grub/grub-multi-install

# Fix any broken EFI/grub packages in rF (reinst-required) state
if dpkg -l grub-efi-arm64-signed 2>/dev/null | grep -q '^rF'; then
  echo "--- VM: reinstalling grub-efi-arm64-signed..."
  sudo grub-install --target=arm64-efi --efi-directory=/boot/efi --no-nvram --removable /dev/sda 2>/dev/null || true
  cd /tmp && sudo apt-get download grub-efi-arm64-signed 2>/dev/null && \
    sudo DEBIAN_FRONTEND=noninteractive dpkg -i grub-efi-arm64-signed_*.deb 2>/dev/null || true
  sudo DEBIAN_FRONTEND=noninteractive apt-get install --reinstall -y shim-signed 2>/dev/null || true
fi

# Kill any stuck debconf/dpkg processes
sudo pkill -9 -f 'dpkg\|debconf' 2>/dev/null || true
sleep 1

echo "--- VM: checking Ansible..."
if ! command -v ansible-playbook &>/dev/null; then
  echo "--- VM: installing Ansible..."
  sudo apt-get update -qq
  sudo apt-get install -y ansible
  echo "--- VM: Ansible installed."
else
  echo "--- VM: Ansible already present ($(ansible --version | head -1))."
fi

cd /tmp/openclaw-ansible

echo "--- VM: installing Ansible collections..."
sudo ansible-galaxy collection install -r requirements.yml --force-with-deps 2>/dev/null || \
  sudo ansible-galaxy collection install -r requirements.yml

echo "--- VM: running OpenClaw playbook..."
sudo ansible-playbook playbook.yml -e ansible_become=false

echo "--- VM: OpenClaw Ansible provisioning complete."
REMOTE

echo ""
echo "=== OpenClaw Ansible Provisioning Complete ==="
