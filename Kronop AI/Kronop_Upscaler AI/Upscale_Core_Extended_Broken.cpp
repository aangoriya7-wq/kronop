#include "Pixel_Interpolation.hpp"
#include <vulkan/vulkan.h>
#include <iostream>
#include <cstring>
#include <vector>

bool UpscaleCore::createComputePipeline() {
        VkPipelineShaderStageCreateInfo shaderStageInfo{};
        shaderStageInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        shaderStageInfo.stage = VK_SHADER_STAGE_COMPUTE_BIT;
        shaderStageInfo.module = computeShaderModule;
        shaderStageInfo.pName = "main";
        
        VkPushConstantRange pushConstantRange{};
        pushConstantRange.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        pushConstantRange.offset = 0;
        pushConstantRange.size = sizeof(PushConstants);
        
        VkPipelineLayoutCreateInfo pipelineLayoutInfo{};
        pipelineLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
        pipelineLayoutInfo.setLayoutCount = 1;
        pipelineLayoutInfo.pSetLayouts = &descriptorSetLayout;
        pipelineLayoutInfo.pushConstantRangeCount = 1;
        pipelineLayoutInfo.pPushConstantRanges = &pushConstantRange;
        
        VkResult result = vkCreatePipelineLayout(device, &pipelineLayoutInfo, nullptr, &pipelineLayout);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create pipeline layout: " << result << std::endl;
            return false;
        }
        
        VkComputePipelineCreateInfo pipelineInfo{};
        pipelineInfo.sType = VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO;
        pipelineInfo.layout = pipelineLayout;
        pipelineInfo.stage = shaderStageInfo;
        
        result = vkCreateComputePipelines(device, VK_NULL_HANDLE, 1, &pipelineInfo, nullptr, &computePipeline);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create compute pipeline: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::createCommandPool() {
        uint32_t queueFamilyIndex = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyIndex, nullptr);
        
        VkCommandPoolCreateInfo poolInfo{};
        poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
        poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
        poolInfo.queueFamilyIndex = queueFamilyIndex;
        
        VkResult result = vkCreateCommandPool(device, &poolInfo, nullptr, &commandPool);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create command pool: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::createDescriptorPool() {
        std::vector<VkDescriptorPoolSize> poolSizes(4);
        
        poolSizes[0].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[0].descriptorCount = 1;
        
        poolSizes[1].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[1].descriptorCount = 1;
        
        poolSizes[2].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[2].descriptorCount = 1;
        
        poolSizes[3].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[3].descriptorCount = 1;
        
        VkDescriptorPoolCreateInfo poolInfo{};
        poolInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO;
        poolInfo.maxSets = 1;
        poolInfo.poolSizeCount = static_cast<uint32_t>(poolSizes.size());
        poolInfo.pPoolSizes = poolSizes.data();
        
        VkResult result = vkCreateDescriptorPool(device, &poolInfo, nullptr, &descriptorPool);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create descriptor pool: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::createDescriptorSets() {
        VkDescriptorSetAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO;
        allocInfo.descriptorPool = descriptorPool;
        allocInfo.descriptorSetCount = 1;
        allocInfo.pSetLayouts = &descriptorSetLayout;
        
        VkResult result = vkAllocateDescriptorSets(device, &allocInfo, &descriptorSet);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate descriptor sets: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::createCommandBuffer() {
        VkCommandBufferAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        allocInfo.commandPool = commandPool;
        allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        allocInfo.commandBufferCount = 1;
        
        VkResult result = vkAllocateCommandBuffers(device, &allocInfo, &commandBuffer);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate command buffer: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::createFenceAndSemaphore() {
        VkFenceCreateInfo fenceInfo{};
        fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
        fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;
        
        VkResult result = vkCreateFence(device, &fenceInfo, nullptr, &fence);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create fence: " << result << std::endl;
            return false;
        }
        
        VkSemaphoreCreateInfo semaphoreInfo{};
        semaphoreInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
        
        result = vkCreateSemaphore(device, &semaphoreInfo, nullptr, &semaphore);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create semaphore: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    uint32_t UpscaleCore::findMemoryType(uint32_t typeFilter, VkMemoryPropertyFlags properties) {
        for (uint32_t i = 0; i < memoryProperties.memoryTypeCount; ++i) {
            if ((typeFilter & (1 << i)) && 
                (memoryProperties.memoryTypes[i].propertyFlags & properties) == properties) {
                return i;
            }
        }
        
        throw std::runtime_error("Failed to find suitable memory type!");
    }
    
    bool UpscaleCore::createBuffer(VkDeviceSize size, VkBufferUsageFlags usage, VkMemoryPropertyFlags properties,
                      VkBuffer& buffer, VkDeviceMemory& bufferMemory) {
        VkBufferCreateInfo bufferInfo{};
        bufferInfo.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
        bufferInfo.size = size;
        bufferInfo.usage = usage;
        bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
        
        VkResult result = vkCreateBuffer(device, &bufferInfo, nullptr, &buffer);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create buffer: " << result << std::endl;
            return false;
        }
        
        VkMemoryRequirements memRequirements;
        vkGetBufferMemoryRequirements(device, buffer, &memRequirements);
        
        VkMemoryAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
        allocInfo.allocationSize = memRequirements.size;
        allocInfo.memoryTypeIndex = findMemoryType(memRequirements.memoryTypeBits, properties);
        
        result = vkAllocateMemory(device, &allocInfo, nullptr, &bufferMemory);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate buffer memory: " << result << std::endl;
            return false;
        }
        
        vkBindBufferMemory(device, buffer, bufferMemory, 0);
        
        return true;
    }
    
    bool UpscaleCore::createBuffers(int inputWidth, int inputHeight, int outputWidth, int outputHeight) {
        VkDeviceSize inputSize = sizeof(float) * inputWidth * inputHeight * 4;
        VkDeviceSize outputSize = sizeof(float) * outputWidth * outputHeight * 4;
        VkDeviceSize weightSize = sizeof(float) * NEURAL_WEIGHTS_SIZE;
        VkDeviceSize biasSize = sizeof(float) * NEURAL_BIASES_SIZE;
        
        // Create input buffer (host visible and coherent for zero-copy)
        if (!createBuffer(inputSize, 
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
                         VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT,
                         inputBuffer, inputMemory)) {
            return false;
        }
        
        // Create output buffer (host visible and coherent for zero-copy)
        if (!createBuffer(outputSize,
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
                         VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT,
                         outputBuffer, outputMemory)) {
            return false;
        }
        
        // Create neural weights buffer (device local for performance)
        if (!createBuffer(weightSize,
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
                         VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT,
                         weightBuffer, weightMemory)) {
            return false;
        }
        
        // Create neural biases buffer (device local for performance)
        if (!createBuffer(biasSize,
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
                         VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT,
                         biasBuffer, biasMemory)) {
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::updateDescriptorSets() {
        VkDescriptorBufferInfo inputBufferInfo{};
        inputBufferInfo.buffer = inputBuffer;
        inputBufferInfo.offset = 0;
        inputBufferInfo.range = VK_WHOLE_SIZE;
        
        VkDescriptorBufferInfo outputBufferInfo{};
        outputBufferInfo.buffer = outputBuffer;
        outputBufferInfo.offset = 0;
        outputBufferInfo.range = VK_WHOLE_SIZE;
        
        VkDescriptorBufferInfo weightBufferInfo{};
        weightBufferInfo.buffer = weightBuffer;
        weightBufferInfo.offset = 0;
        weightBufferInfo.range = VK_WHOLE_SIZE;
        
        VkDescriptorBufferInfo biasBufferInfo{};
        biasBufferInfo.buffer = biasBuffer;
        biasBufferInfo.offset = 0;
        biasBufferInfo.range = VK_WHOLE_SIZE;
        
        std::vector<VkWriteDescriptorSet> descriptorWrites(4);
        
        descriptorWrites[0].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[0].dstSet = descriptorSet;
        descriptorWrites[0].dstBinding = 0;
        descriptorWrites[0].dstArrayElement = 0;
        descriptorWrites[0].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[0].descriptorCount = 1;
        descriptorWrites[0].pBufferInfo = &inputBufferInfo;
        
        descriptorWrites[1].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[1].dstSet = descriptorSet;
        descriptorWrites[1].dstBinding = 1;
        descriptorWrites[1].dstArrayElement = 0;
        descriptorWrites[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[1].descriptorCount = 1;
        descriptorWrites[1].pBufferInfo = &outputBufferInfo;
        
        descriptorWrites[2].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[2].dstSet = descriptorSet;
        descriptorWrites[2].dstBinding = 2;
        descriptorWrites[2].dstArrayElement = 0;
        descriptorWrites[2].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[2].descriptorCount = 1;
        descriptorWrites[2].pBufferInfo = &weightBufferInfo;
        
        descriptorWrites[3].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[3].dstSet = descriptorSet;
        descriptorWrites[3].dstBinding = 3;
        descriptorWrites[3].dstArrayElement = 0;
        descriptorWrites[3].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[3].descriptorCount = 1;
        descriptorWrites[3].pBufferInfo = &biasBufferInfo;
        
        vkUpdateDescriptorSets(device, static_cast<uint32_t>(descriptorWrites.size()), 
                               descriptorWrites.data(), 0, nullptr);
        
        return true;
    }
    
    bool UpscaleCore::recordCommandBuffer(int outputWidth, int outputHeight) {
        VkCommandBufferBeginInfo beginInfo{};
        beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
        beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
        
        VkResult result = vkBeginCommandBuffer(commandBuffer, &beginInfo);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to begin command buffer: " << result << std::endl;
            return false;
        }
        
        vkCmdBindPipeline(commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, computePipeline);
        vkCmdBindDescriptorSets(commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, 
                                pipelineLayout, 0, 1, &descriptorSet, 0, nullptr);
        
        PushConstants pushConstants{};
        pushConstants.inputWidth = outputWidth / SCALE_FACTOR;
        pushConstants.inputHeight = outputHeight / SCALE_FACTOR;
        pushConstants.outputWidth = outputWidth;
        pushConstants.outputHeight = outputHeight;
        pushConstants.scale_factor = SCALE_FACTOR;
        pushConstants.neural_offset = 0;
        
        vkCmdPushConstants(commandBuffer, pipelineLayout, VK_SHADER_STAGE_COMPUTE_BIT,
                          0, sizeof(PushConstants), &pushConstants);
        
        // Calculate workgroup dimensions
        uint32_t groupCountX = (outputWidth + WORKGROUP_SIZE - 1) / WORKGROUP_SIZE;
        uint32_t groupCountY = (outputHeight + WORKGROUP_SIZE - 1) / WORKGROUP_SIZE;
        
        vkCmdDispatch(commandBuffer, groupCountX, groupCountY, 1);
        
        VkMemoryBarrier memoryBarrier{};
        memoryBarrier.sType = VK_STRUCTURE_TYPE_MEMORY_BARRIER;
        memoryBarrier.srcAccessMask = VK_ACCESS_SHADER_WRITE_BIT;
        memoryBarrier.dstAccessMask = VK_ACCESS_HOST_READ_BIT;
        
        vkCmdPipelineBarrier(commandBuffer, VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
                            VK_PIPELINE_STAGE_HOST_BIT, 0, 1, &memoryBarrier, 0, nullptr, 0, nullptr);
        
        result = vkEndCommandBuffer(commandBuffer);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to end command buffer: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool UpscaleCore::submitCommandBuffer() {
        VkSubmitInfo submitInfo{};
        submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
        submitInfo.commandBufferCount = 1;
        submitInfo.pCommandBuffers = &commandBuffer;
        
        vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
        vkResetFences(device, 1, &fence);
        
        VkResult result = vkQueueSubmit(computeQueue, 1, &submitInfo, fence);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to submit command buffer: " << result << std::endl;
            return false;
        }
        
        vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
        
        return true;
    }
    
    bool UpscaleCore::initializeNeuralNetwork() {
        std::vector<float> weights(NEURAL_WEIGHTS_SIZE);
        std::vector<float> biases(NEURAL_BIASES_SIZE);
        
        // Initialize weights with small random values
        for (size_t i = 0; i < weights.size(); ++i) {
            weights[i] = ((float)rand() / RAND_MAX - 0.5f) * 0.1f;
        }
        
        // Initialize biases to zero
        std::fill(biases.begin(), biases.end(), 0.0f);
        
        // Map weight buffer memory and copy data
        void* weightData;
        VkResult result = vkMapMemory(device, weightMemory, 0, VK_WHOLE_SIZE, 0, &weightData);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to map weight memory: " << result << std::endl;
            return false;
        }
        
        memcpy(weightData, weights.data(), sizeof(float) * weights.size());
        vkUnmapMemory(device, weightMemory);
        
        // Map bias buffer memory and copy data
        void* biasData;
        result = vkMapMemory(device, biasMemory, 0, VK_WHOLE_SIZE, 0, &biasData);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to map bias memory: " << result << std::endl;
            return false;
        }
        
        memcpy(biasData, biases.data(), sizeof(float) * biases.size());
        vkUnmapMemory(device, biasMemory);
        
        return true;
    }
