<template>
  <div class="window-controls">
    <div class="control-button no-drag" @click="emit('save')">
      <ElIcon style="margin-right: 5px">
        <svg
          t="1748699910676"
          class="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="1489"
          width="200"
          height="200"
        >
          <path
            d="M819.823 83.694H206.991c-67.703 0-122.588 54.885-122.588 122.588v612.833c0 67.703 54.885 122.588 122.588 122.588h612.833c67.703 0 122.588-54.885 122.588-122.588V206.282c-0.001-67.703-54.885-122.588-122.589-122.588z m-124.435 63.313v241.142H331.772V147.007h363.616z m185.787 672.274c0.027 33.765-27.323 61.158-61.088 61.185H207.133c-16.389 0-31.864-6.297-43.454-17.887s-18.039-26.91-18.039-43.298v-612.94c0.061-33.923 27.57-61.395 61.493-61.41h61.327v245.294c-0.05 33.771 27.286 61.187 61.057 61.237h367.888c33.853 0 61.299-27.387 61.299-61.237V144.931h61.206c33.872 0.036 61.301 27.524 61.265 61.396V819.281z"
            fill=""
            p-id="1490"
          ></path>
          <path
            d="M574.817 329.936c17.483 0 31.656-14.173 31.656-31.656v-61.292c0-17.483-14.173-31.656-31.656-31.656s-31.656 14.173-31.656 31.656v61.292c0 17.483 14.173 31.656 31.656 31.656z"
            fill=""
            p-id="1491"
          ></path>
        </svg>
      </ElIcon>
      保存组态
    </div>
    <div class="control-button no-drag" @click="emit('load')">
      <ElIcon style="margin-right: 5px">
        <svg
          t="1748699957687"
          class="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="4437"
          width="200"
          height="200"
        >
          <path
            d="M896 810.666667a42.666667 42.666667 0 0 1-42.666667 42.666666H170.666667a42.666667 42.666667 0 0 1 0-85.333333h682.666666a42.666667 42.666667 0 0 1 42.666667 42.666667zM763.904 187.904l144.597333 144.597333a42.666667 42.666667 0 0 1 0 60.330667l-144.64 144.64a21.333333 21.333333 0 0 1-36.394666-15.104V202.965333a21.333333 21.333333 0 0 1 36.437333-15.061333zM554.666667 512a42.666667 42.666667 0 0 1-42.666667 42.666667H170.666667a42.666667 42.666667 0 0 1 0-85.333334h341.333333a42.666667 42.666667 0 0 1 42.666667 42.666667z m0-298.666667a42.666667 42.666667 0 0 1-42.666667 42.666667H170.666667a42.666667 42.666667 0 1 1 0-85.333333h341.333333a42.666667 42.666667 0 0 1 42.666667 42.666666z"
            p-id="4438"
          ></path>
        </svg>
      </ElIcon>
      加载组态
    </div>
    <div class="control-button no-drag convert" @click="emit('convert')">
      <ElIcon style="margin-right: 5px">
        <svg
          t="1748700117988"
          class="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="2325"
          width="200"
          height="200"
        >
          <path
            d="M140.8 517.2l169.4-164.1 0.1-15.5v-70.4l-258.1 250 258.1 249.9v-70.4l-0.1-15.5zM865.1 512.4l-169.4-164-0.1-15.5v-70.4l258.1 249.9-258.1 250v-70.5l0.1-15.5zM462.2 855h-77.6l159.1-695.4h77.6z"
            p-id="2326"
            fill="#008556"
          ></path>
        </svg>
      </ElIcon>
      生成代码
    </div>
  </div>
</template>

<script setup>
import { ElIcon, defineEmits } from "element-plus";
const emit = defineEmits(["save", "load", "convert"]);
</script>

<style scoped>
.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 5px 10px;
}

.convert {
  border: 2px solid #008556;
  color: #008556;
  font-weight: bold;
  padding: 5px 20px;
  margin-left: 20px;
}

.convert:hover {
  background-color: rgba(0, 133, 86, 0.1);
}
</style>
