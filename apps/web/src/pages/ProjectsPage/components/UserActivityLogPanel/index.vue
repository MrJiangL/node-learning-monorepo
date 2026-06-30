<script setup lang="ts">
import type { ActivityLog } from "@learn/shared";
import {
  formatActivityLogAction,
  formatActivityLogTime
} from "../ActivityLogPanel/activity-log-display";

type UserActivityLogListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: ActivityLog[] }
  | { status: "error"; message: string };

const props = defineProps<{
  userActivityLogListState: UserActivityLogListState;
}>();

const emit = defineEmits<{
  loadUserActivityLogs: [];
}>();

function formatProjectSnapshotName(log: ActivityLog): string {
  return log.projectSnapshotName ? `Project：${log.projectSnapshotName}` : "Project：未知项目";
}
</script>

<template>
  <section class="activity-log-panel user-activity-log-panel">
    <div class="panel-header">
      <h2>我的最近操作</h2>
      <button type="button" @click="emit('loadUserActivityLogs')">
        {{ props.userActivityLogListState.status === "idle" ? "加载最近操作" : "刷新最近操作" }}
      </button>
    </div>

    <p v-if="props.userActivityLogListState.status === 'idle'">
      加载后可以查看你跨 Project 的最近操作。
    </p>
    <p v-if="props.userActivityLogListState.status === 'loading'">正在加载最近操作...</p>

    <div v-if="props.userActivityLogListState.status === 'error'" class="error">
      <p>最近操作加载失败，可以稍后重试。</p>
      <p>{{ props.userActivityLogListState.message }}</p>
      <button type="button" @click="emit('loadUserActivityLogs')">重试</button>
    </div>

    <p
      v-if="
        props.userActivityLogListState.status === 'success' &&
        props.userActivityLogListState.logs.length === 0
      "
    >
      还没有最近操作。创建 Project 或 Todo 后，这里会显示记录。
    </p>

    <ul v-if="props.userActivityLogListState.status === 'success'" class="activity-log-list">
      <li v-for="log in props.userActivityLogListState.logs" :key="log.id">
        <strong>{{ log.message }}</strong>
        <span>{{ formatActivityLogAction(log.action) }}</span>
        <span>{{ formatProjectSnapshotName(log) }}</span>
        <time :datetime="log.createdAt">{{ formatActivityLogTime(log.createdAt) }}</time>
      </li>
    </ul>
  </section>
</template>
