terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_ecr_repository" "app" {
  name         = var.name
  force_delete = true
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 14
}

resource "aws_secretsmanager_secret" "app" {
  name        = "${var.name}/env"
  description = "Runtime secrets for the gre-crash web function"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    INFERENCE_API_KEY     = var.inference_api_key
    STRIPE_SECRET_KEY     = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET = var.stripe_webhook_secret
  })
}

resource "aws_dynamodb_table" "app" {
  name         = var.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }
}

data "aws_ecr_image" "app" {
  repository_name = aws_ecr_repository.app.name
  image_tag       = var.image_tag
}

resource "aws_iam_role" "lambda" {
  name = "${var.name}-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_data" {
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [aws_dynamodb_table.app.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "web" {
  function_name = var.name
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.app.repository_url}@${data.aws_ecr_image.app.image_digest}"
  architectures = ["arm64"]
  memory_size   = 1536
  timeout       = 60

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.app.name
      FUNCTION_URL           = var.function_url
      PLAN_TIMEZONE          = "America/New_York"
      INFERENCE_API_KEY      = var.inference_api_key
      STRIPE_PUBLISHABLE_KEY = var.stripe_publishable_key
      STRIPE_SECRET_KEY      = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET  = var.stripe_webhook_secret
      ADMIN_NAME             = var.admin_name
      ADMIN_PASSWORD         = var.admin_password
    }
  }

  depends_on = [aws_cloudwatch_log_group.app, aws_iam_role_policy.lambda_data]
}

resource "aws_lambda_function_url" "web" {
  function_name      = aws_lambda_function.web.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "url" {
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.web.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "terraform_data" "function_url_invoke" {
  depends_on = [aws_lambda_function_url.web, aws_lambda_permission.url]

  provisioner "local-exec" {
    command = "aws lambda add-permission --function-name ${aws_lambda_function.web.function_name} --statement-id FunctionURLInvoke --action lambda:InvokeFunction --principal '*' --invoked-via-function-url --region ${var.aws_region} || true"
  }
}

