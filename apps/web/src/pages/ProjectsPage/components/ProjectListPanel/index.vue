<script setup lang="ts">
import { ref, watch } from "vue";
import type { Project } from "@learn/shared";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

const props = defineProps<{
  projectListState: ProjectListState;
  selectedProjectId: string | null;
  savingProjectId?: string | null;
  deletingProjectId?: string | null;
  projectMutationError?: string | null;
}>();

const emit = defineEmits<{
  loadProjects: [];
  logout: [];
  selectProject: [projectId: string];
  createProject: [input: { name: string; description?: string }];
  saveProject: [projectId: string, input: { name: string; description?: string }];
  deleteProject: [projectId: string];
}>();

const projectName = ref("");
const projectDescription = ref("");
const editingProjectId = ref<string | null>(null);
const editingProjectName = ref("");
const editingProjectDescription = ref("");
const confirmingDeleteProjectId = ref<string | null>(null);

watch(
  () => props.savingProjectId,
  (savingProjectId, previousSavingProjectId) => {
    // 保存请求的成功 / 失败由页面层知道。
    //
    // 子组件只观察“刚刚保存的是不是当前编辑的 Project”。
    // 如果保存结束并且没有错误，就退出编辑态；
    // 如果有错误，就保留用户输入，方便用户直接修改后重试。
    if (
      previousSavingProjectId &&
      previousSavingProjectId === editingProjectId.value &&
      savingProjectId === null &&
      !props.projectMutationError
    ) {
      handleCancelEditProject();
    }
  }
);

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

function handleStartEditProject(project: Project) {
  // 编辑状态只影响 ProjectListPanel 内部展示。
  //
  // 真正保存时仍然通过 emit 交给父组件处理，
  // 这样组件不会知道 API、token 或列表刷新细节。
  editingProjectId.value = project.id;
  editingProjectName.value = project.name;
  editingProjectDescription.value = project.description ?? "";
  confirmingDeleteProjectId.value = null;
}

function handleCancelEditProject() {
  editingProjectId.value = null;
  editingProjectName.value = "";
  editingProjectDescription.value = "";
}

function handleSaveProject(projectId: string) {
  const name = editingProjectName.value.trim();
  const description = editingProjectDescription.value.trim();

  if (!name) {
    alert("Project 名称不能为空");
    return;
  }

  emit("saveProject", projectId, {
    name,
    description: description || undefined
  });
}

function handleStartDeleteProject(projectId: string) {
  confirmingDeleteProjectId.value = projectId;
}

function handleCancelDeleteProject() {
  confirmingDeleteProjectId.value = null;
}

function handleConfirmDeleteProject(projectId: string) {
  emit("deleteProject", projectId);
}
</script>

<template>
  <section class="project-panel">
    <div class="panel-header">
      <h2>Projects</h2>
      <div class="toolbar">
        <button type="button" @click="emit('loadProjects')">
          {{
            props.projectListState.status === "loading" ? "正在加载 Projects..." : "加载 Projects"
          }}
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
    <p v-if="props.projectListState.status === 'loading'">正在加载 Projects...</p>
    <p v-if="props.projectListState.status === 'error'" class="error">
      {{ props.projectListState.message }}
    </p>
    <p v-if="props.projectMutationError" class="project-mutation-error">
      {{ props.projectMutationError }}
    </p>

    <p
      v-if="
        props.projectListState.status === 'success' && props.projectListState.projects.length === 0
      "
    >
      你还没有 Project，先创建一个吧。
    </p>

    <ul v-if="props.projectListState.status === 'success'" class="project-list">
      <li
        v-for="project in props.projectListState.projects"
        :key="project.id"
        :class="{ selected: props.selectedProjectId === project.id }"
      >
        <div v-if="editingProjectId !== project.id">
          <strong>{{ project.name }}</strong>
          <span>{{ project.description ?? "暂无描述" }}</span>
        </div>

        <div v-if="editingProjectId === project.id" class="project-edit-form">
          <input v-model="editingProjectName" name="editingProjectName" type="text" />
          <input v-model="editingProjectDescription" name="editingProjectDescription" type="text" />
          <button
            type="button"
            class="primary-action"
            :disabled="props.savingProjectId === project.id"
            @click="handleSaveProject(project.id)"
          >
            {{ props.savingProjectId === project.id ? "保存中..." : "保存" }}
          </button>
          <button type="button" @click="handleCancelEditProject">取消</button>
        </div>

        <div class="project-actions">
          <button type="button" @click="emit('selectProject', project.id)">
            {{ props.selectedProjectId === project.id ? "已选择" : "选择" }}
          </button>
          <button type="button" @click="handleStartEditProject(project)">编辑</button>
          <button
            type="button"
            class="danger-action"
            :disabled="props.deletingProjectId === project.id"
            @click="handleStartDeleteProject(project.id)"
          >
            删除
          </button>
        </div>

        <div v-if="confirmingDeleteProjectId === project.id" class="project-delete-confirmation">
          <p>确定删除这个 Project 吗？</p>
          <div class="project-actions">
            <button
              type="button"
              class="danger-action"
              :disabled="props.deletingProjectId === project.id"
              @click="handleConfirmDeleteProject(project.id)"
            >
              {{ props.deletingProjectId === project.id ? "删除中..." : "确认删除" }}
            </button>
            <button
              type="button"
              :disabled="props.deletingProjectId === project.id"
              @click="handleCancelDeleteProject"
            >
              取消删除
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped></style>
