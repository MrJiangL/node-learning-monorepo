<template>
  <!--
    RouterView 是 Vue Router 的“页面出口”。

    现在 App.vue 不再关心登录、Project、Todo 的具体业务，
    它只负责根据当前 URL 渲染对应页面：
    - /login -> LoginPage
    - /projects -> ProjectsPage
  -->
  <RouterView />
</template>
