# Começa com a imagem oficial do Fluentd
FROM fluent/fluentd:v1.16-1

# MUDANÇA: Muda para o usuário root para ter permissões de instalação
USER root

# Instala o plugin do Elasticsearch como root
RUN fluent-gem install fluent-plugin-elasticsearch --no-doc

# MUDANÇA: Volta para o usuário padrão 'fluent' por segurança
USER fluent

# Copia nosso arquivo de configuração
COPY fluent.conf /fluentd/etc/