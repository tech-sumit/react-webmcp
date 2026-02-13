output "vm_name" {
  description = "Name of the created VM"
  value       = parallels-desktop_remote_vm.n8n_worker.name
}

output "vm_id" {
  description = "ID of the created VM"
  value       = parallels-desktop_remote_vm.n8n_worker.id
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh -p ${var.vm_ssh_port} parallels@localhost"
}
