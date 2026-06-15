# Ansible — Configuration (reverse proxy)

**Terraform crée l'infra, Ansible la configure.** Ce playbook installe et
configure un **reverse proxy nginx** devant le gateway Mythica, à partir d'un
template Jinja2 paramétré.

## Usage (cible : conteneur Docker local)

```bash
cd iac/ansible

# 1. Lancer un conteneur cible (init minimal)
docker run -d --name mythica-target \
  --add-host host.docker.internal:host-gateway \
  ubuntu:22.04 sleep infinity

# 2. Installer la collection de connexion Docker
ansible-galaxy collection install community.docker

# 3. Jouer le playbook
ansible-playbook playbook.yml

# 4. Idempotence : rejouer ne change rien (changed=0)
ansible-playbook playbook.yml
```

## Structure

```
ansible/
├── ansible.cfg                       config (inventory, roles_path, callback)
├── inventory.ini                     cible (connexion community.docker)
├── group_vars/all.yml                variables (gateway_host, port, server_name)
├── playbook.yml                      point d'entrée
└── roles/reverse_proxy/
    ├── tasks/main.yml                install nginx + vhost + validation
    ├── handlers/main.yml             reload nginx
    └── templates/mythica.conf.j2     vhost paramétré (Jinja2)
```

## Idempotence

Toutes les tâches utilisent des modules idempotents (`apt`, `template`, `file`,
`service`). Le handler `Recharger nginx` n'est déclenché **que** si le vhost
change. `nginx -t` est en `changed_when: false` (vérification pure).

## Notes

- La gestion du service (`service: started`) suppose un hôte avec init/systemd
  (VM Vagrant ou serveur réel). Sur un conteneur sans init, la config et
  `nginx -t` passent ; le démarrage du service se fait via `nginx -g 'daemon off;'`.
- Pour une VM : `vagrant up` puis une cible SSH dans `inventory.ini`.
