# Image Keep API embarquant les workflows (provisionnés au démarrage via KEEP_WORKFLOWS_DIRECTORY).
# À builder depuis tools/keep : docker build -t <registry>/keep-api:<tag> .
FROM us-central1-docker.pkg.dev/keephq/keep/keep-api:0.54.3
COPY --chown=keep:keep workflows /workflows
