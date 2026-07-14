Construí o ErnandesBot (AI Doc Agent): um estágio 24/7 que documenta meus repositórios sozinho.

O problema era clássico: o código evolui rápido e a documentação fica para trás. Em vez de escrever README na mão depois de cada push, montei um fluxo automatizado.

Como funciona:
- Webhook do GitHub/Bitbucket chega na API
- Evento vai para uma fila no RabbitMQ
- O worker analisa o diff (ou o repo inteiro, se ainda não houver README)
- Gera/atualiza a documentação com IA (Groq ou OpenAI)
- Também monta um rascunho de post para LinkedIn
- Sobe tudo em branch dedicada e abre PR para a main

Stack: Node.js, RabbitMQ, Docker, GitHub/Bitbucket + LLM.

Aprendizado principal: orquestrar bem webhook → fila → worker é tão importante quanto o prompt da IA. Sem isso, a automação vira caos.

Se curtir a ideia, me conta: você documentaria seus projetos assim?

#AIDocAgent #ErnandesBot #NodeJS #RabbitMQ #IA #GitHub
