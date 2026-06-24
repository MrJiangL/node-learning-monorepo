import { createRouter, createWebHistory } from "vue-router";
import { getAuthToken } from "../auth/token-storage";
import LoginPage from "../pages/LoginPage/index.vue";
import ProjectsPage from "../pages/ProjectsPage/index.vue";
import RegisterPage from "../pages/RegisterPage/index.vue";

export const router = createRouter({
  // createWebHistory 会让 URL 看起来像 /login、/projects。
  //
  // 这比 hash 模式的 /#/login 更接近真实项目常见写法。
  history: createWebHistory(),
  routes: [
    {
      // 首页不直接放业务内容，而是交给 /projects。
      //
      // 如果用户没登录，下面的路由守卫会继续把他带到 /login。
      path: "/",
      redirect: "/projects"
    },
    {
      path: "/login",
      component: LoginPage
    },
    {
      path: "/projects",
      component: ProjectsPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/register",
      component: RegisterPage
    }
  ]
});

router.beforeEach((to) => {
  // 路由守卫可以在页面真正切换前做检查。
  //
  // 这里的规则是：
  // - /projects 需要登录
  // - 如果没有 token，就跳回 /login
  // - /login 本身不需要登录
  if (to.meta.requiresAuth && !getAuthToken()) {
    return "/login";
  }
});
