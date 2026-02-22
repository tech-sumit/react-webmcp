terraform {
  required_providers {
    parallels-desktop = {
      source  = "Parallels/parallels-desktop"
      version = ">= 0.7.0"
    }
    null = {
      source  = "hashicorp/null"
      version = ">= 3.0"
    }
  }
}
