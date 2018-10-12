#!/usr/bin/env bash
#
# DESCRIPTION: ECS Deployment Script
# MAINTAINER: Matias Martin
# DEPENDENCIES: bash (>= 4.4.12), python (~> 2.7.13), awscli (~> 1.11.91), docker-ce (>= 17.03.1)
# FROM: https://github.com/atomicobject/ecs-deployment
#

export PATH=~/.local/bin:$PATH

set -e

# BEGIN CUSTOMIZATIONS #
ECS_REGION='us-east-1'
ECS_CLUSTER_NAME='Eco-TEST'
ECS_SERVICE_NAME='SRV-Eco-Tasks-TEST'
ECR_NAME='eco/task'
ECS_TASK_DEFINITION_NAME='Eco-Tasks-TEST'
ECR_URI='798873886583.dkr.ecr.us-east-1.amazonaws.com'
VERSION=$(date +%s)
AWSCLI_VER_TAR=1.11.91
# END CUSTOMIZATIONS #

# BEGIN OTHER VAR DEFINITIONS #
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
#ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
ENVIRONMENT=""
BRANCH=""
AWSCLI_VER=$(aws --version 2>&1 | cut -d ' ' -f 1 | cut -d '/' -f 2)
# END OTHER VAR DEFINITIONS #

if [[ ${AWSCLI_VER} < ${AWSCLI_VER_TAR} ]]
then echo "ERROR: Please upgrade your AWS CLI to version ${AWSCLI_VER_TAR} or later!"
  exit 1
fi

#Compilo la ultima version
#No se compila nada

ENVIRONMENT="TEST"
BRANCH="develop"

{
  meteor build build --directory
  cd build/bundle/programs/server
  npm install
  cd ../../../..
}

echo "You are deploying ${BRANCH} to ${ENVIRONMENT}."

DOCKERIMAGENAME="eco-tasks"
# Docker operations
(

  # Build the Docker image (to do asset and template compilation, etc.)
  sudo docker build -t "${DOCKERIMAGENAME}:latest" -f Dockerfile .

  # Tag the new Docker image to the remote repo (by date)
  sudo docker tag "${DOCKERIMAGENAME}:latest" "${ECR_URI}/${ECR_NAME}:${DOCKERIMAGENAME}-${VERSION}"

  # Login to ECR us-east-1
  sudo $(aws ecr get-login --region "${ECS_REGION}" --no-include-email)

  # Push to the remote repo (by date)
  sudo docker push "${ECR_URI}/${ECR_NAME}:${DOCKERIMAGENAME}-${VERSION}"

)



# ECS operations
(

  # Store revision
  #REVISION=$(git rev-parse "${BRANCH}")

  # Get previous task definition from ECS
  PREVIOUS_TASK_DEF=$(aws ecs describe-task-definition --region "${ECS_REGION}" --task-definition "${ECS_TASK_DEFINITION_NAME}")

  # Create the new ECS container definition from the last task definition
  NEW_CONTAINER_DEF=$(echo "${PREVIOUS_TASK_DEF}" | python <(cat <<-EOF
import sys, json
definition = json.load(sys.stdin)['taskDefinition']['containerDefinitions']
definition[0]['image'] = '${ECR_URI}/${ECR_NAME}:${DOCKERIMAGENAME}-${VERSION}'
print json.dumps(definition)
EOF
  ))

  # Create the new task definition
  aws ecs register-task-definition --region "${ECS_REGION}" --family "${ECS_TASK_DEFINITION_NAME}" --container-definitions "${NEW_CONTAINER_DEF}"

  # Update the service to use the new task defintion
  aws ecs update-service --region "${ECS_REGION}" --cluster "${ECS_CLUSTER_NAME}" --service "${ECS_SERVICE_NAME}" --task-definition "${ECS_TASK_DEFINITION_NAME}"

  # Stop previous task
  #TODO stopear la tarea anterior
  #PREVIOUS_TASK_ARN=$(aws ecs describe-task-definition --region "us-east-1" --task-definition "EcoBackEmail" | awk -F ' ' '{print $1 " " $24}' | cut -c6-66)
  #aws ecs stop-task --cluster "${ECS_CLUSTER_NAME}" --task "${PREVIOUS_TASK_ARN}"

)

{
  rm -r -f build
}
# Return to original branch
#(
  # Checkout the original branch
  #git checkout "${ORIGINAL_BRANCH}"
#)
