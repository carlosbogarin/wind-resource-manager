# Como Publicar o Wind Resource Manager no seu GitHub 🚀

O projeto já está com o repositório Git local inicializado e todos os arquivos configurados com `.gitignore` adequado para que arquivos pesados ou temporários não subam desnecessariamente.

Siga os 3 passos simples abaixo para publicar no seu GitHub:

---

### Passo 1: Criar o Repositório no GitHub
1. Acesse o seu GitHub: [github.com/new](https://github.com/new)
2. No campo **Repository name**, digite:
   ```
   wind-resource-manager
   ```
   *(ou o nome de sua preferência)*
3. Escolha **Public** ou **Private** (conforme sua preferência).
4. **IMPORTANTE**: Deixe as opções *"Add a README file"*, *"Add .gitignore"* e *"Choose a license"* **DESMARCADAS**, pois o projeto já possui esses arquivos configurados localmente.
5. Clique no botão verde **Create repository**.

---

### Passo 2: Fazer o Primeiro Commit e Conectar ao Repositório Remoto
Abra o terminal (PowerShell) dentro da pasta `c:\Coding\Wind Resource Manager` e execute os comandos abaixo:

```powershell
# 1. Adicionar todos os arquivos ao controle de versão
git add .

# 2. Criar o commit com a versão atual (ex: v2.0.0)
git commit -m "feat: publicar Wind Resource Manager v2.0.0"

# 3. Renomear a branch padrão para main (caso necessário)
git branch -M main

# 4. Vincular o repositório remoto do seu GitHub (substitua SEU_USUARIO pelo seu login no GitHub)
git remote add origin https://github.com/SEU_USUARIO/wind-resource-manager.git

# 5. Enviar os arquivos para o GitHub
git push -u origin main
```

---

### Passo 3: CI/CD Automático (Vercel + Google Cloud Run)

O repositório `carlosbogarin/wind-resource-manager` já está conectado ao pipeline contínuo na branch `main`:

#### Frontend no Vercel:
- Projeto `wind-resource-manager` (`Root Directory = frontend`, framework `Vite`).
- URL de produção: `https://wind-resource-manager.vercel.app`
- Variável de ambiente `VITE_API_URL` apontando para `https://wind-resource-manager-api-1058325672361.us-central1.run.app`.
- Todo `git push` na branch `main` inicia automaticamente o build e publicação na Vercel.
- **Importante (Git local):** no plano Hobby da Vercel com repositório privado, o autor do commit (`git config user.email`) precisa pertencer à sua conta GitHub/Vercel (`bogarin.carlos@gmail.com` ou `carlosbogarin@users.noreply.github.com`); este repositório já está configurado localmente em `.git/config` com `carlosbogarin` / `bogarin.carlos@gmail.com`.

#### Backend no Google Cloud Run:
- Serviço `wind-resource-manager-api` no projeto GCP `smart-curtailment` (região `us-central1`, `4Gi` de memória, `1` vCPU, timeout `300s`).
- Trigger `cloudrun-wind-resource-manager-api-us-central1-main` (Cloud Build em `europe-west1` via Developer Connect) recompila o `Dockerfile` e atualiza o Cloud Run automaticamente a cada push na branch `main`.
- Caso precise executar um deploy manual a partir da raiz `c:\Coding\Wind Resource Manager`:
  ```bash
  gcloud run deploy wind-resource-manager-api \
      --project smart-curtailment \
      --source . \
      --region us-central1 \
      --allow-unauthenticated \
      --memory 4Gi \
      --cpu 1 \
      --timeout 300
  ```