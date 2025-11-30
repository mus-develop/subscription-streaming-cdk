#!/bin/bash

# S3バケット作成スクリプト
# 使用方法: ./create-s3-buckets.sh <project-name> <region>

set -e

PROJECT_NAME=${1:-subscription-streaming}
REGION=${2:-ap-northeast-1}

UPLOAD_BUCKET="${PROJECT_NAME}-vod-raw-uploads"
TRANSCODED_BUCKET="${PROJECT_NAME}-vod-transcoded"

echo "=========================================="
echo "S3 バケットを作成します"
echo "=========================================="
echo "プロジェクト名: ${PROJECT_NAME}"
echo "リージョン: ${REGION}"
echo "アップロード用バケット: ${UPLOAD_BUCKET}"
echo "変換済みバケット: ${TRANSCODED_BUCKET}"
echo "=========================================="
echo ""

# アップロード用バケットの作成
echo "📦 ${UPLOAD_BUCKET} を作成中..."
if aws s3api head-bucket --bucket "${UPLOAD_BUCKET}" 2>/dev/null; then
  echo "✅ ${UPLOAD_BUCKET} は既に存在します"
else
  aws s3api create-bucket \
    --bucket "${UPLOAD_BUCKET}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"

  echo "✅ ${UPLOAD_BUCKET} を作成しました"
fi

# CORS設定を追加
echo "🔧 ${UPLOAD_BUCKET} にCORS設定を追加中..."
cat <<EOF > /tmp/cors-config.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "POST"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": [],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket "${UPLOAD_BUCKET}" \
  --cors-configuration file:///tmp/cors-config.json

echo "✅ CORS設定を追加しました"

# パブリックアクセスブロック設定
echo "🔒 ${UPLOAD_BUCKET} のパブリックアクセスをブロック中..."
aws s3api put-public-access-block \
  --bucket "${UPLOAD_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ パブリックアクセスをブロックしました"

echo ""

# 変換済みバケットの作成
echo "📦 ${TRANSCODED_BUCKET} を作成中..."
if aws s3api head-bucket --bucket "${TRANSCODED_BUCKET}" 2>/dev/null; then
  echo "✅ ${TRANSCODED_BUCKET} は既に存在します"
else
  aws s3api create-bucket \
    --bucket "${TRANSCODED_BUCKET}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"

  echo "✅ ${TRANSCODED_BUCKET} を作成しました"
fi

# パブリックアクセスブロック設定
echo "🔒 ${TRANSCODED_BUCKET} のパブリックアクセスをブロック中..."
aws s3api put-public-access-block \
  --bucket "${TRANSCODED_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ パブリックアクセスをブロックしました"

# 一時ファイルの削除
rm -f /tmp/cors-config.json

echo ""
echo "=========================================="
echo "✅ すべてのS3バケットが作成されました"
echo "=========================================="
echo ""
echo "作成されたバケット:"
echo "  - ${UPLOAD_BUCKET}"
echo "  - ${TRANSCODED_BUCKET}"
echo ""
