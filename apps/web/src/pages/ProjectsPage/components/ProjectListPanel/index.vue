<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "@learn/shared";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

const props = defineProps<{
  projectListState: ProjectListState;
  selectedProjectId: string | null;
}>();

const emit = defineEmits<{
  loadProjects: [];
  logout: [];
  selectProject: [projectId: string];
  createProject: [input: { name: string; description?: string }];
}>();

const projectName = ref("");
const projectDescription = ref("");

function handleSubmitCreateProject() {
  const name = projectName.value.trim();
  const description = projectDescription.value.trim();

  if (!name) {
    // 这里先用浏览器 alert 降低学习成本。
    //
    // 真正项目里更常见的是把表单错误做成组件状态，
    // 但当前任务重点是 props / emit，不把范围扩太大。
    alert("Project 名称不能为空");
    return;
  }

  emit("createProject", {
    name,
    description: description || undefined
  });

  projectName.value = "";
  projectDescription.value = "";
}
</script>

<template>
  <section class="project-panel">
    <div class="panel-header">
      <h2>Projects</h2>
      <div class="toolbar">
        <button type="button" @click="emit('loadProjects')">
          {{ props.projectListState.status === "loading" ? "加载中..." : "加载 Projects" }}
        </button>
        <button type="button" @click="emit('logout')">退出登录</button>
      </div>
    </div>

    <form class="project-form" @submit.prevent="handleSubmitCreateProject">
      <input v-model="projectName" name="projectName" type="text" placeholder="Project name" />
      <input
        v-model="projectDescription"
        name="projectDescription"
        type="text"
        placeholder="Project description"
      />
      <button type="submit">创建 Project</button>
    </form>

    <p v-if="props.projectListState.status === 'idle'">登录后可以加载你的 Project。</p>
    <p v-if="props.projectListState.status === 'error'" class="error">
      {{ props.projectListState.message }}
    </p>

    <p
      v-if="
        props.projectListState.status === 'success' && props.projectListState.projects.length === 0
      "
    >
      你还没有 Project。
    </p>

    <ul v-if="props.projectListState.status === 'success'" class="project-list">
      <li
        v-for="project in props.projectListState.projects"
        :key="project.id"
        :class="{ selected: props.selectedProjectId === project.id }"
      >
        <strong>{{ project.name }}</strong>
        <span>{{ project.description ?? "暂无描述" }}</span>
        <button type="button" @click="emit('selectProject', project.id)">
          {{ props.selectedProjectId === project.id ? "已选择" : "选择" }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped></style>
