# Soc Web

一个前后端分离的聊天 Web 应用。

当前仓库包含：

- `src/`：Vue 3 前端
- `service/`：Node.js + Express 后端
- `knowledge-graph/`：可选的 LightRAG 本地知识图谱能力
- `docker-compose/`、`Dockerfile`：容器化部署相关文件

项目支持本地开发、Docker 部署，以及可选的 Web Search / Knowledge Graph 扩展能力。

## 主要能力

- 多会话聊天界面
- 登录、注册、重置密码、2FA
- MongoDB 持久化用户与配置数据
- 管理员后台配置
- API Key / 模型配置管理
- 用户管理、额度与礼品卡
- 统计信息与聊天记录查看
- 可选的 Web Search
- 可选的 LightRAG 本地知识图谱检索

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Pinia、Vue Router、Vue I18n、Naive UI
- 后端：Node.js、Express、TypeScript、MongoDB
- 扩展能力：Tavily Web Search、LightRAG

## 目录结构

```text
.
├─ src/                  前端源码
├─ public/               静态资源
├─ service/              后端源码
├─ knowledge-graph/      LightRAG 与本地图谱数据
├─ docker-compose/       Docker Compose 示例
├─ kubernetes/           Kubernetes 部署示例
├─ .local-mongo/         本地 Mongo 启动辅助脚本
├─ start-all.ps1         Windows 一键启动脚本
├─ stop-all.ps1          Windows 一键停止脚本
└─ Dockerfile            多阶段构建镜像
```

## 环境要求

- Node.js `^20 || ^22 || ^24`
- `pnpm`
- MongoDB

如果你在 Windows 上开发，这个仓库还提供了基于 `.local-mongo/` 的一键启动脚本。

## 快速开始

### 1. 安装依赖

前端：

```powershell
pnpm bootstrap
```

后端：

```powershell
Set-Location service
pnpm install
```

### 2. 配置环境变量

前端配置文件：

```powershell
Copy-Item .env.example .env
```

后端配置文件：

```powershell
Copy-Item service\.env.example service\.env
```

建议至少检查以下变量：

- 根目录 `.env`
  - `VITE_APP_API_BASE_URL`
  - `VITE_GLOB_API_URL`
- `service/.env`
  - `OPENAI_API_KEY`
  - `OPENAI_API_BASE_URL`
  - `MONGODB_URL`
  - `SITE_TITLE`
  - `AUTH_SECRET_KEY`
  - `ROOT_USER`
  - `PASSWORD_MD5_SALT`

如果 `AUTH_SECRET_KEY` 为空，站点可以不启用登录。
如果你希望启用登录，请同时配置：

- `AUTH_SECRET_KEY`
- `PASSWORD_MD5_SALT`
- `ROOT_USER`
- `REGISTER_ENABLED=true`

### 3. 启动开发环境

先启动后端：

```powershell
Set-Location service
pnpm start
```

再启动前端：

```powershell
Set-Location ..
pnpm dev
```

默认端口：

- 前端：`http://127.0.0.1:1002`
- 后端：`http://127.0.0.1:3002`

## Windows 一键启动

仓库根目录提供了一个 PowerShell 脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

这个脚本会依次启动：

- 本地 MongoDB 内存实例，端口 `27017`
- 后端服务，端口 `3002`
- 前端开发服务，端口 `1002`

停止脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all.ps1
```

## 构建

前端构建：

```powershell
pnpm build
```

后端构建：

```powershell
Set-Location service
pnpm build
```

前端构建产物输出到 `dist/`，后端构建产物输出到 `service/build/`。

## Docker

### 使用 Dockerfile 构建镜像

```powershell
docker build -t soc-web .
docker run --rm -p 3002:3002 --env-file service/.env soc-web
```

这个镜像会：

- 构建前端并将产物复制到后端静态目录
- 构建后端 TypeScript 代码
- 把 `knowledge-graph/` 一并复制进镜像

### 使用 Docker Compose

示例文件位于 `docker-compose/`：

- `docker-compose.yml`：应用 + MongoDB + Mongo GUI + Nginx
- `docker-compose-mongodb.yml`：单独启动 MongoDB

示例：

```powershell
Set-Location docker-compose
docker compose up -d
```

## 登录与初始化建议

如果启用了登录能力，建议首次启动后按下面的顺序初始化：

1. 配置 `service/.env` 中的 `AUTH_SECRET_KEY`、`PASSWORD_MD5_SALT`、`ROOT_USER`
2. 确认 `REGISTER_ENABLED=true`
3. 启动系统并注册管理员账号
4. 进入管理设置页完善站点配置、模型配置、邮件配置等
5. 完成后按需关闭公开注册

## 可选能力

### Web Search

后端内置了可选的联网检索配置，默认配置模型提示词已经准备好。管理员可在设置页中启用搜索，并填写 Tavily 等搜索服务所需配置。

### Knowledge Graph

仓库内已经集成了 LightRAG 相关目录和后端接入逻辑。默认路径如下：

- 仓库目录：`knowledge-graph/LightRAG`
- 工作目录：`knowledge-graph/lesson_kb`

这部分是可选能力：

- 不使用知识图谱时，不影响基础聊天能力
- 使用前需要准备本地索引数据和 Python 运行环境
- 相关参数可在管理员设置页中调整

## 常用检查命令

前端：

```powershell
pnpm lint
pnpm lint:fix
pnpm type-check
```

后端：

```powershell
Set-Location service
pnpm lint
pnpm lint:fix
pnpm type-check
```

## 开发说明

- 前端默认通过 `/api` 代理到 `VITE_APP_API_BASE_URL`
- Vite 开发端口固定为 `1002`
- 后端默认端口为 `3002`
- `components.d.ts` 和 `auto-imports.d.ts` 为自动导入生成文件
- 提交前可执行 `pnpm bootstrap` 以安装 Husky hooks

仓库内还有一份给自动化编码代理使用的说明文件：

- `AGENTS.md`

## 许可证

[MIT](./LICENSE)
