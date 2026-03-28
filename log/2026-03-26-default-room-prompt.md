# Default Room Prompt Change

## Summary

This change sets `prompt/prompt.txt` as the default prompt for chat rooms.

- New rooms now store the default prompt when created.
- Existing rooms fall back to the same default prompt when their `prompt` field is empty.
- The frontend store now keeps the returned room prompt immediately after room creation.

## Source Prompt File

- Path: `D:\hci\mathtutor\chatgpt-web-main\prompt\prompt.txt`
- Encoding: UTF-8

## Files Changed

- `service/src/utils/defaultRoomPrompt.ts`
- `service/src/storage/mongo.ts`
- `service/src/routes/room.ts`
- `service/src/chatgpt/index.ts`
- `src/store/modules/chat/index.ts`

## Implementation Details

### 1. Centralized default prompt loading

Added `service/src/utils/defaultRoomPrompt.ts`:

- Reads `prompt/prompt.txt` with UTF-8.
- Supports resolving the file from common runtime working directories.
- Falls back to the built-in English assistant prompt if the file is missing or unreadable.

### 2. New room default prompt

Updated `service/src/storage/mongo.ts`:

- `createChatRoom()` now assigns `room.prompt = DEFAULT_ROOM_PROMPT` before inserting the room.

### 3. Existing room fallback

Updated `service/src/routes/room.ts`:

- `/chatrooms` now returns `r.prompt || DEFAULT_ROOM_PROMPT`.

This keeps old rooms usable even if they were created before this change.

### 4. Runtime chat fallback

Updated `service/src/chatgpt/index.ts`:

- Chat execution now uses `DEFAULT_ROOM_PROMPT` when `options.room.prompt` is empty.

This ensures model behavior stays consistent even if a room record has no saved prompt.

### 5. Frontend state sync

Updated `src/store/modules/chat/index.ts`:

- After creating a room, the frontend now stores `result.data?.prompt`.

This makes the new room show the prompt immediately without waiting for another sync.

## Verification

- `service/pnpm type-check`: passed
- Root `pnpm type-check`: not clean, but the failure is unrelated to this change

Current frontend type-check issues observed:

- `src/App.vue` is reported as not being a module
- Permission error when writing `node_modules/.vue-global-types/vue_3.5_0.d.ts`

## Notes

- The `prompt/` directory is currently untracked in git.
- If `prompt/prompt.txt` is not included in deployment, the service will fall back to the built-in English prompt.
