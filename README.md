# docker-manager

Simple management tool for Docker containers on Linux.

## Installation

Install Docker Manager as global dependency:

```bash
# Yarn
sudo yarn global add docker-manager

# npm
sudo npm install -g docker-manager
```

Install the systemd service to enable auto start after boot:

```bash
sudo docker-manager install
```

If you wish to uninstall the systemd service, run:

```bash
sudo docker-manager uninstall
```

## Terminology

### Application

Applications are a collection of services that you would like to run. For example, a typical web application has two services, namely a backend and a frontend.

### Services

Services are containers that you would like to run. Services are exactly the same as [Docker Compose services](https://docs.docker.com/compose/compose-file/#service-configuration-reference).

### Containers

Containers are runtime instances of an image. Containers are exactly the same as [Docker containers](https://docs.docker.com/glossary/#container).

### Images

Images are exactly the same as [Docker images](https://docs.docker.com/glossary/#image).

## Configuration

You can define applications in `/srv/docker`. These applications need to be defined in [Docker Compose files](https://docs.docker.com/compose/compose-file/). The folder structure should look like this:

```
/srv/docker
├── application1.yml
├── application2.yml
└── common.yml
```

The `common.yml` file is special and can be used to define common networks or volumes. It is required and is always included with other applications. Application definition files can have any name other than `common.yml`, for example `/srv/docker/hello-world.yml`.

Take a look at the example section below to see what these application definition files might look like.

## Usage

```
Docker Manager CLI

docker-manager <command>

Commands:
  docker-manager install                                        Install systemd service
  docker-manager version                                        Displays version information
  docker-manager list                                           Lists applications
  docker-manager services <application>                         List services of an application
  docker-manager start <application> [services..]               Start an application
  docker-manager stop <application> [services..]                Stop an application
  docker-manager restart <application> [services..]             Restart an application
  docker-manager update <application> [services..]              Update an application
  docker-manager status <application> [services..]              Display status of an application           [aliases: ps]
  docker-manager top <application> [services..]                 Display running processes of an application
  docker-manager images <application> [services..]              Display images of an application
  docker-manager logs <application> [services..]                Display logs of an application
  docker-manager exec <application> <service> <command>         Execute a command in the container of a service
  [arguments..]
  docker-manager tokens                                         Lists tokens
  docker-manager create-token <name> <applications..>           Creates a token
  docker-manager delete-token <name>                            Deletes a token

Options:
  --version  Show version number                                                                               [boolean]
  --help     Show help                                                                                         [boolean]
```

## Example

### Configuration

```
/srv/docker
├── common.yml
└── hello-world.yml
```

The `common.yml` file:

```yml
version: '3'
networks:
    bridge:
        driver: bridge
        ipam:
            driver: default
            config:
                - subnet: 172.20.0.0/16
```

The `hello-world.yml` application definition file:

```yml
version: '3'
services:
    hello-world-backend:
        image: tutum/hello-world
        restart: unless-stopped
        networks:
            - bridge
    hello-world-frontend:
        image: tutum/hello-world
        restart: unless-stopped
        networks:
            - bridge
```

### Management

```bash
# Start all applications
docker-manager start all

# Stop only the frontend service of the hello-world application
docker-manager stop hello-world hello-world-frontend

# Update all applications, this automatically services them if needed
docker-manager update all

# Display status of all services of hello-world
docker-manager status hello-world

# Display logs of the backend service of the hello-world application
docker-manager logs -f hello-world hello-world-backend

# Execute a command in the container of the backend service of the hello-world application
docker-manager exec hello-world hello-world-backend ls -alh
docker-manager exec hello-world hello-world-backend -e test=123 sh -c "echo \$test"
```
