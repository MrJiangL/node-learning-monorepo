<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginUser, registerUser } from "../../api/auth";
import { setAuthToken, setRefreshToken } from "../../auth/token-storage";

type RegisterState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

const router = useRouter();

const email = ref("");
const password = ref("");
const name = ref("");
const state = ref<RegisterState>({ status: "idle" });

async function handleRegister() {
  state.value = { status: "submitting" };

  try {
    // 当前后端注册接口只负责创建用户，不直接返回 token。
    //
    // 所以前端注册成功后，再用同一组 email/password 自动登录一次。
    // 这样用户提交注册表单后，不需要再手动回登录页输入一遍。
    await registerUser({
      email: email.value,
      password: password.value,
      name: name.value.trim() || undefined
    });

    const result = await loginUser({
      email: email.value,
      password: password.value
    });

    setAuthToken(result.data.accessToken);
    setRefreshToken(result.data.refreshToken);

    await router.push("/projects");
  } catch (error) {
    state.value = {
      status: "error",
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
}
</script>

<template>
  <main class="app-shell">
    <section class="status-panel">
      <p class="eyebrow">Node Learning Monorepo</p>
      <h1>注册</h1>

      <form class="login-form" @submit.prevent="handleRegister">
        <label>
          邮箱
          <input v-model="email" name="email" type="email" autocomplete="email" required />
        </label>

        <label>
          密码
          <input
            v-model="password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
          />
        </label>

        <label>
          昵称
          <input v-model="name" name="name" type="text" autocomplete="name" />
        </label>

        <button type="submit" :disabled="state.status === 'submitting'">
          {{ state.status === "submitting" ? "注册中..." : "注册" }}
        </button>
      </form>

      <button class="link-button" type="button" @click="router.push('/login')">
        已有账号？去登录
      </button>

      <p v-if="state.status === 'error'" class="error">{{ state.message }}</p>
    </section>
  </main>
</template>
