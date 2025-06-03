<template>
  <div class="welcome-page">
    <Transition name="welcome-title" mode="out-in">
      <div class="wrapper" v-if="!projectPath">
        <div class="welcome-content">
          <div class="title">
            <img src="/logo.png" class="title-icon" />
          </div>
          <div class="buttons">
            <button @click="createProject">
              <ElIcon size="60">
                <svg
                  t="1748673916109"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="6009"
                  width="200"
                  height="200"
                >
                  <path
                    d="M772.102946 802.282293L772.102946 868.441085 772.102946 802.282293Z"
                    fill=""
                    p-id="6010"
                  ></path>
                  <path
                    d="M548.679387 931.310971L548.679387 530.374486 895.478881 338.352101l0.029676 254.140141 57.290821 0-0.038886-332.669682L516.033873 7.745405 79.366605 259.923868l0.059352 504.253572 436.726619 252.076132 255.951393-147.81351 0-66.157769L548.679387 931.310971zM480.497519 929.525302L136.712685 731.09395l-0.046049-397.695674L480.497519 533.768793 480.497519 929.525302zM501.285984 467.705168L169.218006 274.191826 516.042059 73.89908l351.349113 202.796776L522.42135 467.705168 501.285984 467.705168z"
                    fill=""
                    p-id="6011"
                  ></path>
                  <path
                    d="M1023.978511 708.730617L928.742473 708.730617 928.742473 616.565521 867.337961 616.565521 867.337961 708.730617 772.102946 708.730617 772.102946 770.135128 867.337961 770.135128 867.337961 868.441085 928.742473 868.441085 928.742473 770.135128 1023.978511 770.135128Z"
                    fill=""
                    p-id="6012"
                  ></path>
                </svg>
              </ElIcon>
              新建项目
            </button>
            <button @click="openProject">
              <ElIcon size="60">
                <svg
                  t="1748673997176"
                  class="icon"
                  viewBox="0 0 1260 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="3595"
                  width="200"
                  height="200"
                >
                  <path
                    d="M1058.848012 935.688021H88.993243l113.018307-453.124559h969.854769zM88.993243 88.839223h397.403905l52.566655 157.699962h554.052534v147.186632h-893.63312A88.837646 88.837646 0 0 0 115.802237 461.011134l-27.33466 109.338641zM1181.853983 394.251483V246.013518A88.311979 88.311979 0 0 0 1093.016337 157.701539h-490.972549l-31.014326-95.67131A88.311979 88.311979 0 0 0 486.922815 0.001577H88.993243A88.311979 88.311979 0 0 0 0.155598 88.839223V935.688021a88.837646 88.837646 0 0 0 0 10.513331v14.718663a87.260646 87.260646 0 0 0 26.808993 37.847991h5.782332a87.260646 87.260646 0 0 0 39.950657 14.718663h986.150432A88.837646 88.837646 0 0 0 1145.057325 946.201352l113.018307-453.124559a88.837646 88.837646 0 0 0-76.221649-98.82531z"
                    p-id="3596"
                  ></path>
                </svg>
              </ElIcon>
              打开项目
            </button>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="welcome-create-page" mode="out-in">
      <div class="wrapper" v-if="projectPath">
        <CreateProject
          ref="createProjCompRef"
          :projectPath="projectPath"
          @create-project="
            (data) => {
              emit('passCreateProject');
            }
          "
          @back="projectPath = ''"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, defineEmits } from "vue";
import { ElIcon, ElNotification } from "element-plus";
import CreateProject from "./CreateProject.vue";
const createProjCompRef = ref(null);
const projectPath = ref("");
const emit = defineEmits(["passCreateProject"]);

function createProject() {
  window.ipcApi
    .createProject()
    .then((result) => {
      if (result) {
        projectPath.value = result;
      }
    })
    .catch((error) => {
      console.error("Error creating project:", error);
    });
}

function openProject() {
  window.ipcApi
    .openProjectDir()
    .then(() => {
      emit("passCreateProject");
    })
    .catch((error) => {
      let errorMessage = window.ipcApi.extractErrorMessage(error);
      if (errorMessage === "CANCEL") {
        return;
      }
      ElNotification({
        title: "打开项目失败",
        message: errorMessage,
        showClose: false,
        type: "error",
        duration: 2500,
        customClass: "default-notification",
      });
    });
}
</script>

<style scoped>
.welcome-page {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  z-index: 500;
}

.wrapper {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.welcome-content {
  text-align: center;
  color: #333;
  max-width: 80%;
  justify-content: center;
  align-items: center;
}

.title {
  font-size: 50px;
  font-weight: bold;
  margin-bottom: 30px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title-icon {
  width: 70%;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

button {
  padding: 20px;
  font-size: 25px;
  font-weight: bold;
  background-color: transparent;
  color: var(--color-dark-0);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: none;
  gap: 15px;
  height: 300px;
  width: 300px;
  border-radius: 20px;
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.icon {
  fill: var(--color-dark-0);
  width: 100%;
  height: 100%;
}

button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.welcome-title-enter-active,
.welcome-title-leave-active {
  transition: transform 0.3s, opacity 0.3s;
}

.welcome-title-enter-from,
.welcome-title-leave-to {
  transform: scale(0.5);
  opacity: 0;
}

.welcome-create-page-enter-active,
.welcome-create-page-leave-active {
  transition: transform 0.3s, opacity 0.3s;
}

.welcome-create-page-enter-from,
.welcome-create-page-leave-to {
  transform: translateX(100%) scale(1.5);
  opacity: 0;
}
</style>
