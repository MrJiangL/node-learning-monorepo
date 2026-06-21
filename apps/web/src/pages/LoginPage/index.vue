<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginUser } from "../../api/auth";
import { setAuthToken, setRefreshToken } from "../../auth/token-storage";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

const router = useRouter();

const email = ref("");
const password = ref("");
const state = ref<LoginState>({ status: "idle" });

async function handleLogin() {
  state.value = { status: "submitting" };

  try {
    const result = await loginUser({
      email: email.value,
      password: password.value
    });

    // 登录成功后保存 accessToken。
    //
    // 后续 /projects 页面会从 localStorage 读取这个 accessToken，
    // 再请求受保护的 Project / Todo 接口。
    setAuthToken(result.data.accessToken);
    setRefreshToken(result.data.refreshToken);

    // 编程式跳转。
    //
    // 用户不需要手动点击链接，登录成功后直接进入工作台。
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
      <h1>登录</h1>

      <form class="login-form" @submit.prevent="handleLogin">
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
            autocomplete="current-password"
            required
          />
        </label>

        <button type="submit" :disabled="state.status === 'submitting'">
          {{ state.status === "submitting" ? "登录中..." : "登录" }}
        </button>
      </form>

      <p v-if="state.status === 'error'" class="error">{{ state.message }}</p>
    </section>
  </main>
</template>
