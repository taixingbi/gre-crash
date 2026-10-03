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

variable "supabase_url" {
  type    = string
  default = "https://wgwcbcynjtmwgihohasw.supabase.co"
}

variable "supabase_publishable_key" {
  type    = string
  default = ""
}

variable "function_url" {
  type    = string
  default = "https://gwjg7secnplcnrbdxrb52ijbge0dwwnu.lambda-url.us-east-1.on.aws/"
}

variable "inference_api_key" {
  type      = string
  sensitive = true
  default   = "replace-me"
}

variable "supabase_secret_key" {
  type      = string
  sensitive = true
  default   = "replace-me"
}

variable "stripe_publishable_key" {
  type    = string
  default = ""
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = "replace-me"
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
  default   = "replace-me"
}
