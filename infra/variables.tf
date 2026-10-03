variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type    = string
  default = "gre-crash"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "function_url" {
  type    = string
  default = "https://gwjg7secnplcnrbdxrb52ijbge0dwwnu.lambda-url.us-east-1.on.aws/"
}

variable "inference_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "admin_name" {
  type    = string
  default = "taixingbi"
}

variable "admin_password" {
  type      = string
  sensitive = true
  default   = "123456"
}

variable "stripe_publishable_key" {
  type    = string
  default = ""
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}
