<script setup lang="ts">
import type { ActivityLog } from "@learn/shared";
import {
  formatActivityLogAction,
  formatActivityLogMetadata,
  formatActivityLogTime
} from "./activity-log-display.ts";

type ActivityLogListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: ActivityLog[] }
  | { status: "error"; message: string };

const props = defineProps<{
  selectedProjectId: string | null;
  activityLogListState: ActivityLogListState;
}>();

const emit = defineEmits<{
  loadActivityLogs: [];
}>();
</script>

<template>
  <section class="activity-log-panel">
    <div class="panel-header">
      <h2>Activity Log</h2>
      <button v-if="props.selectedProjectId" type="button" @click="emit('loadActivityLogs')">
        刷新活动记录
      </button>
    </div>

    <p v-if="!props.selectedProjectId">先选择一个 Project，再查看活动记录。</p>
    <p v-else-if="props.activityLogListState.status === 'idle'">
      选择 Project 后会显示这个 Project 的活动记录。
    </p>

    <p v-if="props.activityLogListState.status === 'loading'">正在加载活动记录...</p>

    <div v-if="props.activityLogListState.status === 'error'" class="error">
      <p>{{ props.activityLogListState.message }}</p>
      <button type="button" @click="emit('loadActivityLogs')">重试</button>
    </div>

    <p
      v-if="
        props.activityLogListState.status === 'success' &&
        props.activityLogListState.logs.length === 0
      "
    >
      这个 Project 还没有活动记录。
    </p>

    <ul v-if="props.activityLogListState.status === 'success'" class="activity-log-list">
      <li v-for="log in props.activityLogListState.logs" :key="log.id">
        <strong>{{ log.message }}</strong>
        <small v-if="formatActivityLogMetadata(log)">
          {{ formatActivityLogMetadata(log) }}
        </small>
        <span>{{ formatActivityLogAction(log.action) }}</span>
        <time :datetime="log.createdAt">{{ formatActivityLogTime(log.createdAt) }}</time>
      </li>
    </ul>
  </section>
</template>
