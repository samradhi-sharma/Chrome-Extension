// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Set up periodic alarm to check tasks more frequently (every 15 seconds)
  chrome.alarms.create('checkTasks', { periodInMinutes: 0.25 });
  
  // Initialize storage if needed
  chrome.storage.sync.get(['tasks'], function(result) {
    if (!result.tasks) {
      chrome.storage.sync.set({ tasks: [] });
    }
  });
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTasks') {
    checkTasks();
  }
});

// Function to check tasks and send notifications
function checkTasks() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    tasks.forEach(function(task) {
      // Skip if task is already completed
      if (task.completed) return;
      
      const taskTime = task.time;
      const taskDate = task.dueDate || currentDate; // If no due date, assume today
      
      // Parse task time into minutes for comparison
      const [taskHours, taskMinutes] = taskTime.split(':').map(Number);
      const taskTotalMinutes = taskHours * 60 + taskMinutes;
      
      // Parse current time into minutes
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      
      // Check if it's time for the task notification (1-minute window)
      // Only notify if we haven't already notified for this task
      const timeWindow = 1; // 1-minute window to ensure we don't miss the notification
      const isWithinTimeWindow = Math.abs(taskTotalMinutes - currentTotalMinutes) <= timeWindow;
      
      if (isWithinTimeWindow && taskDate === currentDate && !task.notified) {
        // Mark this task as notified to prevent duplicate notifications
        markTaskNotified(task.id);
        
        showNotification(
          `Task Reminder: ${task.category || 'General'}`,
          `It's time for: ${task.task}`,
          task.id
        );
      }
      
      // Check for overdue tasks (only once per task)
      const taskDateTime = new Date(`${taskDate}T${taskTime}`);
      if (taskDateTime < now && !task.overdueNotified) {
        // Mark this task as having received an overdue notification
        markTaskOverdueNotified(task.id);
        
        showNotification(
          `Overdue Task: ${task.category || 'General'}`,
          `The task "${task.task}" scheduled for ${taskTime} on ${formatDate(taskDate)} is overdue.`,
          task.id
        );
      }
    });
  });
}

// Helper function to format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Function to mark a task as having received an overdue notification
function markTaskOverdueNotified(taskId) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, overdueNotified: true };
      }
      return task;
    });
    
    chrome.storage.sync.set({ tasks: updatedTasks });
  });
}

// Function to mark a task as having received a notification
function markTaskNotified(taskId) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, notified: true };
      }
      return task;
    });
    
    chrome.storage.sync.set({ tasks: updatedTasks });
  });
}

// Function to show Chrome notifications
function showNotification(title, message, taskId) {
  chrome.notifications.create(`task-${taskId}`, {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: title,
    message: message,
    priority: 2,
    buttons: [
      { title: 'Mark Complete' },
      { title: 'Dismiss' }
    ]
  });
}

// Listen for notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Extract task ID from notification ID
  const taskId = parseInt(notificationId.replace('task-', ''));
  
  if (buttonIndex === 0) {
    // Mark Complete button clicked
    markTaskComplete(taskId);
  }
  
  // Close the notification
  chrome.notifications.clear(notificationId);
});

// Function to mark a task as complete
function markTaskComplete(taskId) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, completed: true };
      }
      return task;
    });
    
    chrome.storage.sync.set({ tasks: updatedTasks });
  });
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTasks') {
    chrome.storage.sync.get(['tasks'], function(result) {
      sendResponse({ tasks: result.tasks || [] });
    });
    return true; // Required for async sendResponse
  }
  
  if (message.action === 'addTask') {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      
      // Add the notified flag to prevent immediate notification
      // Only set this flag if the task time is within the notification window
      const now = new Date();
      const taskTime = message.task.time;
      const taskDate = message.task.dueDate || now.toISOString().split('T')[0];
      
      // Parse task time into minutes for comparison
      const [taskHours, taskMinutes] = taskTime.split(':').map(Number);
      const taskTotalMinutes = taskHours * 60 + taskMinutes;
      
      // Parse current time into minutes
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      
      // Check if task time is within 1 minute of the current time
      const timeWindow = 1;
      const isWithinTimeWindow = Math.abs(taskTotalMinutes - currentTotalMinutes) <= timeWindow;
      const isToday = taskDate === now.toISOString().split('T')[0];
      
      // Only set notified flag if the task would trigger an immediate notification
      if (isWithinTimeWindow && isToday) {
        message.task.notified = true;
      }
      
      tasks.push(message.task);
      chrome.storage.sync.set({ tasks: tasks }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (message.action === 'deleteTask') {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      const updatedTasks = tasks.filter(task => task.id !== message.taskId);
      chrome.storage.sync.set({ tasks: updatedTasks }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (message.action === 'updateTask') {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      const updatedTasks = tasks.map(task => {
        if (task.id === message.task.id) {
          return message.task;
        }
        return task;
      });
      chrome.storage.sync.set({ tasks: updatedTasks }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
