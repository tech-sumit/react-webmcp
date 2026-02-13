###############################################################################
# Parallels Desktop DevOps API
#
# Deploys the prldevops REST API service on the macOS host.
# VM lifecycle is managed by the Makefile via prlctl (not Terraform).
#
# Requires Parallels Desktop Pro or Business edition.
###############################################################################

resource "parallels-desktop_deploy" "devops_api" {
  # Deploy locally -- no SSH needed (provider will use local prlctl)
  install_local = true

  api_config {
    port           = "8080"
    prefix         = "/api"
    root_password  = var.parallels_password
    enable_tls     = false
    enable_logging = true
  }
}
