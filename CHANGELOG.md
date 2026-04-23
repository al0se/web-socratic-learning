# 更新日志

## v1.0.1 - 2026-04-23

### 新增
- 在 `service/src/memory` 下使用 TypeScript 移植 DeepTutor 的双文件记忆系统，其中 `PROFILE.md` 用于保存稳定的学习者画像，`SUMMARY.md` 用于保存学习旅程摘要。
- 将记忆文件保存到项目根目录的 `data/` 目录，并支持读取、写入、清空、快照，以及旧版 `memory.md` 迁移。
- 新增记忆接口，支持读取、保存、刷新和清空记忆，可通过 `/memory` 和 `/api/memory` 访问。
- 在每轮聊天成功完成后自动尝试刷新记忆，同时更新 `PROFILE.md` 和 `SUMMARY.md`，且不会阻塞聊天响应。
- 在聊天生成提示词中注入记忆上下文，使模型可以在相关场景下参考用户画像和学习摘要。
- 新增前端记忆管理页面，支持两份记忆文件的可视化查看、编辑、预览、保存、从对话刷新和清空。

### 变更
- 将侧边栏中的记忆占位页替换为真实的记忆管理页面。
- 将记忆页面背景和头部样式调整为与聊天页、知识库页一致的纯白背景，不再使用渐变色。
- 新增前端记忆 API 封装和中英文界面文案。
- 重新生成 `components.d.ts`，补充本次新增的自动导入组件和图标声明。

### 验证
- 后端 TypeScript 检查 `tsc --noEmit` 已通过。
- 后端 ESLint 已通过。
- 前端 TypeScript 检查 `vue-tsc --noEmit` 已通过。
- 前端 `eslint src` 已通过。
- 前端全量 `eslint .` 仍会在既有文件 `knowledge-graph/lesson_kb/vdb_entities.json` 上触发 ESLint JSONC 栈溢出，该问题与本次改动无关。
