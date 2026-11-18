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

### Passo 3: Conectar ao Vercel e Google Cloud Run

#### Frontend no Vercel:
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New... -> Project**.
2. Importe o repositório `wind-resource-manager`.
3. Na seção **Root Directory**, clique em Edit e selecione a pasta:
   ```
   frontend
   ```
4. Em **Environment Variables**, adicione (opcionalmente após subir o backend):
   - `VITE_API_URL`: URL do backend no Cloud Run (ex: `https://wind-resource-manager-xxx.run.app`)
5. Clique em **Deploy**!

#### Backend no Google Cloud Run:
1. Certifique-se de ter o Google Cloud SDK (`gcloud`) instalado e autenticado.
2. Na raiz do projeto `c:\Coding\Wind Resource Manager`, execute:
   ```bash
   gcloud run deploy wind-resource-manager \
       --source . \
       --region southamerica-east1 \
       --platform managed \
       --allow-unauthenticated \
       --memory 2Gi \
       --cpu 2
   ```
3. O Cloud Run fornecerá uma URL HTTPS (ex: `https://wind-resource-manager-xxx.southamerica-east1.run.app`) que você poderá colar na variável `VITE_API_URL` do Vercel.