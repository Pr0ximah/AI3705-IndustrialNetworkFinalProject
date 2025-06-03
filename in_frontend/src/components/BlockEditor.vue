<template>
  <div class="block-editor">
    <div class="mask" :class="{ show: showMask }" />
    <div class="title">组件编辑器</div>
    <div class="edit custom-scrollbar">
      <div class="type-label" style="margin-top: 5px">
        <div>
          <span>名称</span>
        </div>
        <ElInput
          v-model="categoryConf.name"
          placeholder="请输入组件名称"
          v-if="categoryConf"
        />
      </div>
      <div class="type-label">
        <div>
          <span>输入输出</span>
        </div>
        <ElCollapse v-model="activeValues" class="block-collapse">
          <ElCollapseItem title="信号输入" name="sig-in" class="sig">
            <ElCollapse v-model="sigInActiveValues" class="inside-collapse">
              <ElCollapseItem
                v-for="(item, index) in categoryConf?.signal_input"
                :title="item.name"
                :key="index"
                :name="`sig-in-${index}`"
              >
                <template #title>
                  <div class="collapse-title-wrapper">
                    <button
                      @click.stop="deleteItem('signal_input', index)"
                      class="delete-btn"
                      :class="{ clicked: sigInDeleteButtonClicked[index] }"
                    >
                      <div
                        v-if="sigInDeleteButtonClicked[index]"
                        class="delete-btn-text"
                      >
                        删除
                      </div>
                      <ElIcon v-else size="15"><Close /></ElIcon>
                    </button>
                    <span
                      @click="unsetDeleteButtonClicked('signal_input', index)"
                      class="collapse-title"
                      >{{ item.name }}</span
                    >
                  </div>
                </template>

                <div class="feature-item">
                  <span>名称</span>
                  <ElInput
                    v-model="item.name"
                    placeholder="请输入信号名称"
                  ></ElInput>
                </div>
                <div class="feature-item">
                  <span>描述</span>
                  <ElInput
                    v-model="item.description"
                    placeholder="请输入信号描述"
                  ></ElInput>
                </div>
              </ElCollapseItem>
              <button
                class="add-btn"
                @click="
                  categoryConf.signal_input.push({ name: '', description: '' });
                  sigInActiveValues.push(
                    `sig-in-${categoryConf.signal_input.length - 1}`
                  );
                  sigInDeleteButtonClicked.push(false);
                "
              >
                添加
              </button>
            </ElCollapse>
          </ElCollapseItem>
          <ElCollapseItem title="信号输出" name="sig-out" class="sig">
            <ElCollapse v-model="sigOutActiveValues" class="inside-collapse">
              <ElCollapseItem
                v-for="(item, index) in categoryConf?.signal_output"
                :title="item.name"
                :key="index"
                :name="`sig-out-${index}`"
              >
                <template #title>
                  <div class="collapse-title-wrapper">
                    <button
                      @click.stop="deleteItem('signal_output', index)"
                      class="delete-btn"
                      :class="{ clicked: sigOutDeleteButtonClicked[index] }"
                    >
                      <div
                        v-if="sigOutDeleteButtonClicked[index]"
                        class="delete-btn-text"
                      >
                        删除
                      </div>
                      <ElIcon v-else size="15"><Close /></ElIcon>
                    </button>
                    <span
                      @click="unsetDeleteButtonClicked('signal_output', index)"
                      class="collapse-title"
                      >{{ item.name }}</span
                    >
                  </div>
                </template>

                <div class="feature-item">
                  <span>名称</span>
                  <ElInput
                    v-model="item.name"
                    placeholder="请输入信号名称"
                  ></ElInput>
                </div>
                <div class="feature-item">
                  <span>描述</span>
                  <ElInput
                    v-model="item.description"
                    placeholder="请输入信号描述"
                  ></ElInput>
                </div>
              </ElCollapseItem>
              <button
                class="add-btn"
                @click="
                  categoryConf.signal_output.push({
                    name: '',
                    description: '',
                  });
                  sigOutActiveValues.push(
                    `sig-out-${categoryConf.signal_output.length - 1}`
                  );
                  sigOutDeleteButtonClicked.push(false);
                "
              >
                添加
              </button>
            </ElCollapse>
          </ElCollapseItem>
          <ElCollapseItem title="变量输入" name="var-in" class="var">
            <ElCollapse v-model="varInActiveValues" class="inside-collapse">
              <ElCollapseItem
                v-for="(item, index) in categoryConf?.var_input"
                :title="item.name"
                :key="index"
                :name="`var-in-${index}`"
              >
                <template #title>
                  <div class="collapse-title-wrapper">
                    <button
                      @click.stop="deleteItem('var_input', index)"
                      class="delete-btn"
                      :class="{ clicked: varInDeleteButtonClicked[index] }"
                    >
                      <div
                        v-if="varInDeleteButtonClicked[index]"
                        class="delete-btn-text"
                      >
                        删除
                      </div>
                      <ElIcon v-else size="15"><Close /></ElIcon>
                    </button>
                    <span
                      @click="unsetDeleteButtonClicked('var_input', index)"
                      class="collapse-title"
                      >{{ item.name }}</span
                    >
                  </div>
                </template>

                <div class="feature-item">
                  <span>名称</span>
                  <ElInput
                    v-model="item.name"
                    placeholder="请输入变量名称"
                  ></ElInput>
                </div>
                <div class="feature-item">
                  <span>类型</span>
                  <ElSelect v-model="item.type" placeholder="选择变量类型">
                    <ElOption
                      v-for="type in validVarTypes"
                      :key="type"
                      :label="type"
                      :value="type"
                    />
                  </ElSelect>
                </div>
                <div class="feature-item">
                  <span>描述</span>
                  <ElInput
                    v-model="item.description"
                    placeholder="请输入变量描述"
                  ></ElInput>
                </div>
              </ElCollapseItem>
              <button
                class="add-btn"
                @click="
                  categoryConf.var_input.push({
                    name: '',
                    type: '',
                    description: '',
                  });
                  varInActiveValues.push(
                    `var-in-${categoryConf.var_input.length - 1}`
                  );
                  varInDeleteButtonClicked.push(false);
                "
              >
                添加
              </button>
            </ElCollapse>
          </ElCollapseItem>
          <ElCollapseItem title="变量输出" name="var-out" class="var">
            <ElCollapse v-model="varOutActiveValues" class="inside-collapse">
              <ElCollapseItem
                v-for="(item, index) in categoryConf?.var_output"
                :title="item.name"
                :key="index"
                :name="`var-out-${index}`"
              >
                <template #title>
                  <div class="collapse-title-wrapper">
                    <button
                      @click.stop="deleteItem('var_output', index)"
                      class="delete-btn"
                      :class="{ clicked: varOutDeleteButtonClicked[index] }"
                    >
                      <div
                        v-if="varOutDeleteButtonClicked[index]"
                        class="delete-btn-text"
                      >
                        删除
                      </div>
                      <ElIcon v-else size="15"><Close /></ElIcon>
                    </button>
                    <span
                      @click="unsetDeleteButtonClicked('var_output', index)"
                      class="collapse-title"
                      >{{ item.name }}</span
                    >
                  </div>
                </template>

                <div class="feature-item">
                  <span>名称</span>
                  <ElInput
                    v-model="item.name"
                    placeholder="请输入变量名称"
                  ></ElInput>
                </div>
                <div class="feature-item">
                  <span>类型</span>
                  <ElSelect v-model="item.type" placeholder="选择变量类型">
                    <ElOption
                      v-for="type in validVarTypes"
                      :key="type"
                      :label="type"
                      :value="type"
                    />
                  </ElSelect>
                </div>
                <div class="feature-item">
                  <span>描述</span>
                  <ElInput
                    v-model="item.description"
                    placeholder="请输入变量描述"
                  ></ElInput>
                </div>
              </ElCollapseItem>
              <button
                class="add-btn"
                @click="
                  categoryConf.var_output.push({
                    name: '',
                    type: '',
                    description: '',
                  });
                  varOutActiveValues.push(
                    `var-out-${categoryConf.var_output.length - 1}`
                  );
                  varOutDeleteButtonClicked.push(false);
                "
              >
                添加
              </button>
            </ElCollapse>
          </ElCollapseItem>
        </ElCollapse>
      </div>
    </div>
    <div class="buttons">
      <button @click="closeWindow(false)">取消</button>
      <button @click="closeWindow(true)" class="fill">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref, defineExpose } from "vue";
import {
  ElCollapse,
  ElCollapseItem,
  ElIcon,
  ElInput,
  ElSelect,
  ElOption,
  ElNotification,
} from "element-plus";
import { Close } from "@element-plus/icons-vue";
import { VAR_TYPE } from "./BlockBaseConf";

const categoryConf = ref(null);
const activeValues = ref([]);
const sigInActiveValues = ref([]);
const sigOutActiveValues = ref([]);
const varInActiveValues = ref([]);
const varOutActiveValues = ref([]);
const sigInDeleteButtonClicked = ref([]);
const sigOutDeleteButtonClicked = ref([]);
const varInDeleteButtonClicked = ref([]);
const varOutDeleteButtonClicked = ref([]);
const showMask = ref(false);

// 定义可选的变量类型
const validVarTypes = ref(VAR_TYPE);

function initBlock(_categoryConf, _currentCategoryId) {
  categoryConf.value = _categoryConf;
  // 初始化所有删除按钮点击状态数组
  sigInDeleteButtonClicked.value = new Array(
    categoryConf.value?.signal_input?.length || 0
  ).fill(false);
  sigOutDeleteButtonClicked.value = new Array(
    categoryConf.value?.signal_output?.length || 0
  ).fill(false);
  varInDeleteButtonClicked.value = new Array(
    categoryConf.value?.var_input?.length || 0
  ).fill(false);
  varOutDeleteButtonClicked.value = new Array(
    categoryConf.value?.var_output?.length || 0
  ).fill(false);
}

function validateData() {
  // 验证信号输入
  if (categoryConf.value?.signal_input) {
    const signalInputNames = new Set();
    for (let i = 0; i < categoryConf.value.signal_input.length; i++) {
      const item = categoryConf.value.signal_input[i];
      if (!item.name.trim()) {
        ElNotification({
          title: "信号输入错误",
          showClose: false,
          message: `信号输入第${i + 1}项的名称不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (signalInputNames.has(item.name.trim())) {
        ElNotification({
          title: "信号输入错误",
          showClose: false,
          message: `信号输入中存在重复的名称："${item.name.trim()}"`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      signalInputNames.add(item.name.trim());
      if (!item.description.trim()) {
        ElNotification({
          title: "信号输入错误",
          showClose: false,
          message: `信号输入第${i + 1}项的描述不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
    }
  }

  // 验证信号输出
  if (categoryConf.value?.signal_output) {
    const signalOutputNames = new Set();
    for (let i = 0; i < categoryConf.value.signal_output.length; i++) {
      const item = categoryConf.value.signal_output[i];
      if (!item.name.trim()) {
        ElNotification({
          title: "信号输出错误",
          showClose: false,
          message: `信号输出第${i + 1}项的名称不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (signalOutputNames.has(item.name.trim())) {
        ElNotification({
          title: "信号输出错误",
          showClose: false,
          message: `信号输出中存在重复的名称："${item.name.trim()}"`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      signalOutputNames.add(item.name.trim());
      if (!item.description.trim()) {
        ElNotification({
          title: "信号输出错误",
          showClose: false,
          message: `信号输出第${i + 1}项的描述不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
    }
  }

  // 验证变量输入
  if (categoryConf.value?.var_input) {
    const varInputNames = new Set();
    for (let i = 0; i < categoryConf.value.var_input.length; i++) {
      const item = categoryConf.value.var_input[i];
      if (!item.name.trim()) {
        ElNotification({
          title: "变量输入错误",
          showClose: false,
          message: `变量输入第${i + 1}项的名称不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (varInputNames.has(item.name.trim())) {
        ElNotification({
          title: "变量输入错误",
          showClose: false,
          message: `变量输入中存在重复的名称："${item.name.trim()}"`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      varInputNames.add(item.name.trim());
      if (!item.type) {
        ElNotification({
          title: "变量输入错误",
          showClose: false,
          message: `变量输入第${i + 1}项的类型不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (!item.description.trim()) {
        ElNotification({
          title: "变量输入错误",
          showClose: false,
          message: `变量输入第${i + 1}项的描述不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
    }
  }

  // 验证变量输出
  if (categoryConf.value?.var_output) {
    const varOutputNames = new Set();
    for (let i = 0; i < categoryConf.value.var_output.length; i++) {
      const item = categoryConf.value.var_output[i];
      if (!item.name.trim()) {
        ElNotification({
          title: "变量输出错误",
          showClose: false,
          message: `变量输出第${i + 1}项的名称不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (varOutputNames.has(item.name.trim())) {
        ElNotification({
          title: "变量输出错误",
          showClose: false,
          message: `变量输出中存在重复的名称："${item.name.trim()}"`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      varOutputNames.add(item.name.trim());
      if (!item.type) {
        ElNotification({
          title: "变量输出错误",
          showClose: false,
          message: `变量输出第${i + 1}项的类型不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
      if (!item.description.trim()) {
        ElNotification({
          title: "变量输出错误",
          showClose: false,
          message: `变量输出第${i + 1}项的描述不能为空`,
          type: "error",
          duration: 2000,
          customClass: "default-notification",
        });
        return false;
      }
    }
  }

  return true;
}

function closeWindow(saveChanges) {
  if (saveChanges) {
    // 验证数据
    if (!validateData()) {
      return;
    }

    showMask.value = true;

    const categoryConfJSON = JSON.stringify(categoryConf.value, null, 2);

    // 处理保存逻辑
    window.ipcApi
      .saveModifiedBlockCategory(categoryConfJSON)
      .then(() => {
        ElNotification({
          title: "保存成功",
          showClose: false,
          message: "功能块配置已成功保存",
          type: "success",
          duration: 2000,
          customClass: "default-notification",
        });
        // 关闭窗口
        setTimeout(() => {
          showMask.value = false;
          window.ipcApi.send("close-window", "block-editor");
        }, 800);
      })
      .catch((error) => {
        showMask.value = false;
        let errorMessage = window.ipcApi.extractErrorMessage(error);
        ElNotification({
          title: "保存失败",
          message: errorMessage,
          showClose: false,
          type: "error",
          duration: 2500,
          customClass: "default-notification",
        });
      });
  } else {
    // 处理取消逻辑
    window.ipcApi.send("close-window", "block-editor");
  }
}

function deleteItem(type, index) {
  const deleteButtonClickedMap = {
    signal_input: sigInDeleteButtonClicked,
    signal_output: sigOutDeleteButtonClicked,
    var_input: varInDeleteButtonClicked,
    var_output: varOutDeleteButtonClicked,
  };

  const activeValuesMap = {
    signal_input: sigInActiveValues,
    signal_output: sigOutActiveValues,
    var_input: varInActiveValues,
    var_output: varOutActiveValues,
  };

  const prefixMap = {
    signal_input: "sig-in",
    signal_output: "sig-out",
    var_input: "var-in",
    var_output: "var-out",
  };

  if (deleteButtonClickedMap[type].value[index]) {
    // 如果按钮已经被点击，执行删除操作
    categoryConf.value[type].splice(index, 1);
    deleteButtonClickedMap[type].value.splice(index, 1);

    // 更新activeValuesMap数组，移除被删除项，并重新计算索引
    const prefix = prefixMap[type];
    activeValuesMap[type].value = activeValuesMap[type].value
      .filter((value) => {
        const itemIndex = parseInt(value.split("-")[1]);
        return itemIndex !== index;
      })
      .map((value) => {
        const parts = value.split("-");
        const itemIndex = parseInt(parts[1]);
        // 对于索引大于被删除项的元素，减少索引
        return itemIndex > index ? `${prefix}-${itemIndex - 1}` : value;
      });

    // 更新主activeValues
    activeValues.value = activeValues.value
      .filter((value) => value !== `${prefix}-${index}`)
      .map((value) => {
        // 只处理当前类型的值
        if (value.startsWith(`${prefix}-`)) {
          const itemIndex = parseInt(value.split("-")[1]);
          // 对于索引大于被删除项的元素，减少索引
          return itemIndex > index ? `${prefix}-${itemIndex - 1}` : value;
        }
        return value;
      });
  } else {
    // 首次点击时设置为确认状态
    deleteButtonClickedMap[type].value[index] = true;

    // 3秒后自动重置按钮状态
    setTimeout(() => {
      if (deleteButtonClickedMap[type].value[index]) {
        deleteButtonClickedMap[type].value[index] = false;
      }
    }, 3000);
  }
}

function unsetDeleteButtonClicked(type, index) {
  const deleteButtonClickedMap = {
    signal_input: sigInDeleteButtonClicked,
    signal_output: sigOutDeleteButtonClicked,
    var_input: varInDeleteButtonClicked,
    var_output: varOutDeleteButtonClicked,
  };

  // 确保索引有效，防止访问越界
  if (index >= 0 && index < deleteButtonClickedMap[type].value.length) {
    deleteButtonClickedMap[type].value[index] = false;
  }
}

defineExpose({
  initBlock,
});
</script>

<style scoped>
.block-editor {
  flex: 1;
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 20px;
  height: calc(100% - 40px);
  color: #333;
}

.title {
  font-weight: bold;
  width: 100%;
  align-self: flex-start;
  text-align: left;
  justify-self: flex-start;
  font-size: 28px;
}

.edit {
  flex: 1;
  width: 100%;
  margin: 20px 0px;
  overflow-y: auto;
}

.buttons {
  width: 100%;
  height: 40px;
  align-self: flex-end;
  display: flex;
  gap: 10px;
}

button {
  flex: 1;
  height: 40px;
  background-color: white;
  border-radius: 6px;
  font-weight: 600;
  border: 1px solid var(--color-dark-0);
  letter-spacing: 2px;
  transition: background-color 0.15s ease;
}

button.fill {
  background-color: var(--color-dark-0);
  color: white;
}

button:hover {
  background-color: #f0f0f0;
  cursor: pointer;
}

button.fill:hover {
  background-color: var(--color-dark-2);
}

.block-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 16px;
  transition: color 0.15s ease;
}

.inside-collapse :deep(.el-collapse-item__header) {
  font-weight: normal;
  font-size: 14px;
}

.block-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 5px;
}

.el-collapse.inside-collapse {
  margin-left: 10px;
}

.inside-collapse :deep(.el-collapse-item__content) {
  gap: 5px;
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
}

.block-collapse .sig :deep(.el-collapse-item__header):hover {
  color: var(--signal-connector-color-dark);
}

.block-collapse .var :deep(.el-collapse-item__header):hover {
  color: var(--var-connector-color-dark);
}

.sig .inside-collapse :deep(.el-collapse-item__header):hover {
  color: black;
}

.var .inside-collapse :deep(.el-collapse-item__header):hover {
  color: black;
}

.feature-item {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.feature-item span {
  width: 50px;
  font-weight: 600;
}

.feature-item :deep(.el-input) {
  flex: 1;
  max-width: 300px;
  margin-right: 10px;
}

.feature-item :deep(.el-select) {
  flex: 1;
  max-width: 300px;
  margin-right: 10px;
}

button.delete-btn {
  width: 20px;
  height: 20px;
  flex: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.2s ease, boder-color 0.2s ease;
}

button.add-btn {
  margin-top: 5px;
  width: calc(100% - 20px);
  height: 30px;
  background-color: var(--color-dark-0);
  color: white;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  letter-spacing: 2px;
  margin-right: 20px;
}

button .delete-btn.clicked {
  background-color: var(--color-important);
  width: 40px;
  color: white;
  border-color: transparent;
}

.delete-btn .delete-btn-text {
  font-size: 9px;
  width: 40px;
  word-break: keep-all;
  overflow: hidden;
}

div .collapse-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row;
}

span .collapse-title {
  flex: 1;
}

span .collapse-title:hover {
  font-weight: 600;
}

.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(3px);
  transform: opacity 0.1s ease;
}

.mask.show {
  opacity: 1;
  z-index: 500;
  pointer-events: auto;
}

.mask:not(.show) {
  opacity: 0;
  pointer-events: none;
}

.type-label {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 15px;
}

.type-label > div {
  width: 100%;
  align-items: center;
  margin-bottom: 5px;
}

.type-label > div > span {
  font-weight: 600;
  font-size: 16px;
  width: 35%;
  border-radius: 50px;
  padding: 10px 20px;
  color: white;
  background-color: var(--color-dark-0);
  display: inline-block;
}

.type-label > .el-input {
  width: 95%;
}
</style>
