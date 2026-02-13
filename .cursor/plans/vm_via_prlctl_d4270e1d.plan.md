---
name: VM via prlctl
overview: Replace the broken `parallels-desktop_remote_vm` Terraform resource (which requires an empty DevOps API catalog) with direct `prlctl` commands in the Makefile. Terraform keeps managing the DevOps API; the Makefile manages the full VM lifecycle.
todos:
  - id: tf-remove-remote-vm
    content: Remove parallels-desktop_remote_vm resource from Terraform module and clean up outputs/variables
    status: completed
  - id: makefile-vm-create
    content: "Add vm-create target: clone/download Ubuntu with Rosetta, configure specs, start, wait for IP"
    status: completed
  - id: makefile-vm-ports
    content: "Add vm-ports target: set up NAT port forwarding via prlsrvctl for SSH, n8n, Vault, OpenClaw"
    status: completed
  - id: makefile-vm-provision
    content: "Add vm-provision target: install Docker, Node.js, OpenClaw, utilities via SSH"
    status: completed
  - id: makefile-vm-destroy
    content: Update vm-destroy and destroy targets to use prlctl instead of Terraform
    status: completed
  - id: makefile-up-flow
    content: Update the up target dependency chain to use new VM targets
    status: completed
  - id: tf-state-cleanup
    content: Remove stale remote_vm resource from Terraform state if present
    status: completed
  - id: test-full-flow
    content: Test make up end-to-end
    status: completed
isProject: false
---

