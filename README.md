# ErnandesBot
Sistema de documentação automática para repositórios Git. Meu estágiario 24/7.

## O que é o projeto
O ErnandesBot (AI Doc Agent) é uma aplicação Node.js que utiliza inteligência artificial (IA) para gerar documentação automática para repositórios Git. Ele utiliza os serviços de IA da OpenAI ou Groq para gerar textos baseados em código-fonte.

## Arquitetura
A aplicação é composta por três serviços principais:
- **API**: Responsável por receber webhooks do GitHub ou Bitbucket e enviar eventos para a fila de processamento.
- **Fila de processamento**: Utiliza o RabbitMQ para armazenar eventos de processamento.
- **Worker**: Responsável por processar os eventos da fila e gerar documentação automática utilizando IA.

## Como funciona
1. O repositório Git é configurado para enviar webhooks para a API do AI Doc Agent.
2. A API recebe o webhook e envia um evento para a fila de processamento.
3. O worker processa o evento da fila e gera documentação automática utilizando IA.
4. A documentação gerada é commitada no repositório Git.

## Configuração
A configuração da aplicação é feita por meio de variáveis de ambiente definidas no arquivo `.env`. As variáveis mais importantes são:
- `LLM_PROVIDER`: Escolha do provedor de IA (OpenAI ou Groq).
- `OPENAI_API_KEY` ou `GROQ_API_KEY`: Chave de API do provedor de IA escolhido.
- `RABBITMQ_URL`: URL do servidor RabbitMQ.
- `RABBITMQ_QUEUE`: Nome da fila de processamento.
- `GIT_PROVIDER`: Provedor de versionamento (GitHub ou Bitbucket).
- `DOC_TARGET_FILE`: Arquivo de documentação a ser gerado.
- `LINKEDIN_ENABLED`: Flag para habilitar a geração de apresentação para LinkedIn.
- `LINKEDIN_TARGET_FILE`: Arquivo de apresentação para LinkedIn.
- `LINKEDIN_MAX_CHARS`: Número máximo de caracteres para a apresentação no LinkedIn.
- `LINKEDIN_MAX_HASHTAGS`: Número máximo de hashtags para a apresentação no LinkedIn.
- `DOC_CREATE_PULL_REQUEST`: Flag para criar pull request automático no GitHub.
- `DOC_PULL_REQUEST_TITLE` e `DOC_PULL_REQUEST_BODY`: Título e corpo do pull request.
- `GITHUB_TOKEN`: Token de acesso para o GitHub.

## Como executar
A aplicação pode ser executada utilizando o comando `docker-compose up --build` após configurar as variáveis de ambiente no arquivo `.env`.

## Fluxo de documentação automática
1. O worker processa o evento da fila e gera documentação automática utilizando IA.
2. A documentação gerada é escrita no arquivo de documentação configurado (`DOC_TARGET_FILE`).
3. O worker commita a documentação gerada no repositório Git.
4. Se configurado, o worker cria um pull request automático no GitHub.

## Branch de documentação
A aplicação pode ser configurada para commitar a documentação gerada em um branch separado (configuração `DOC_BRANCH_STRATEGY=dedicated`) ou no branch principal (configuração `DOC_BRANCH_STRATEGY=same`).

## Bootstrap
Se o arquivo de documentação não existir, a aplicação pode ser configurada para gerar um arquivo inicial com base nos arquivos do repositório (configuração `DOC_BOOTSTRAP_MAX_FILES` e `DOC_BOOTSTRAP_MAX_FILE_BYTES`).

## Apresentação para LinkedIn
A aplicação pode ser configurada para gerar uma apresentação para LinkedIn com base no conteúdo do README e no diff do repositório. A apresentação é gerada utilizando IA e pode ser commitada no repositório Git. A apresentação deve ter no máximo 1500 caracteres e 6 hashtags. O tom deve ser profissional, humano e objetivo, evitando exageros e clickbait. A estrutura da apresentação deve ser composta por: 
1. Gancho em 1 frase,
2. Problema ou motivação,
3. O que foi construido (2-4 bullets ou frases),
4. Stack em 1 linha,
5. Aprendizado ou impacto,
6. CTA curto (ex.: link do repo ou convite a opinião).