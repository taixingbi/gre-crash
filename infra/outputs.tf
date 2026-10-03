output "function_url" {
  value = aws_lambda_function_url.web.function_url
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}
