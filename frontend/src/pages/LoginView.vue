<template>
  <LoginForm @login-success="onLoginSuccess" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import LoginForm from '../components/LoginForm.vue';

const router = useRouter();

function onLoginSuccess() {
  router.push('/orders');
}
</script> 