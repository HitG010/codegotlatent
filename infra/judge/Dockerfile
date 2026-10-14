# go-judge sandbox with the compilers CGL supports.
# The base image's /opt/mount.yaml already exposes /usr, /etc/alternatives
# and Java 21's config inside the sandbox.
# v1.13.0 fails every run on Docker Desktop in cgroup v1 mode ("lstat stdout:
# operation not permitted"); v1.12.1 works. Revisit when upgrading.
FROM criyle/go-judge:v1.12.1

RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ python3 openjdk-21-jdk-headless nodejs \
 && rm -rf /var/lib/apt/lists/*

# Only reachable on the private network / localhost; see docker-compose.yml
EXPOSE 5050
ENTRYPOINT ["/opt/go-judge", "-http-addr", ":5050"]
