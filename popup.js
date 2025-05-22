document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const form = document.getElementById('todoForm');
  const taskInput = document.getElementById('taskInput');
  const taskTime = document.getElementById('taskTime');
  const taskDueDate = document.getElementById('taskDueDate');
  const taskCategory = document.getElementById('taskCategory');
  const tasksContainer = document.getElementById('tasks');
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  const clockElement = document.getElementById('clock');
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  taskDueDate.value = today;
  
  // Update clock
  function updateClock() {
    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Update clock every second
  updateClock();
  setInterval(updateClock, 1000);
  
  // Form submission
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Get form values
    const task = taskInput.value.trim();
    const time = taskTime.value;
    const dueDate = taskDueDate.value || today;
    const category = taskCategory.value || 'General';
    
    if (task && time) {
      // Create new task object
      const newTask = {
        id: Date.now(),
        task: task,
        time: time,
        dueDate: dueDate,
        category: category,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      // Save task using Chrome storage API
      addTask(newTask);
      form.reset();
      taskDueDate.value = today; // Reset date to today after form reset
    }
  });
  
  // Add event listeners for filters
  categoryFilter.addEventListener('change', displayTasks);
  statusFilter.addEventListener('change', displayTasks);
  
  // Function to add a task
  function addTask(task) {
    chrome.runtime.sendMessage(
      { action: 'addTask', task: task },
      function(response) {
        if (response && response.success) {
          displayTasks();
        }
      }
    );
  }
  
  // Function to delete a task
  function deleteTask(taskId) {
    chrome.runtime.sendMessage(
      { action: 'deleteTask', taskId: taskId },
      function(response) {
        if (response && response.success) {
          displayTasks();
        }
      }
    );
  }
  
  // Function to toggle task completion status
  function toggleTaskComplete(taskId, completed) {
    chrome.runtime.sendMessage(
      { 
        action: 'updateTask', 
        task: { id: taskId, completed: completed } 
      },
      function(response) {
        if (response && response.success) {
          displayTasks();
        }
      }
    );
  }
  
  // Function to display tasks with filtering
  function displayTasks() {
    tasksContainer.innerHTML = '<div class="loading">Loading tasks...</div>';
    
    chrome.runtime.sendMessage({ action: 'getTasks' }, function(response) {
      tasksContainer.innerHTML = '';
      
      if (!response || !response.tasks || response.tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="no-tasks">No tasks yet. Add one above!</div>';
        return;
      }
      
      // Get filter values
      const categoryValue = categoryFilter.value;
      const statusValue = statusFilter.value;
      
      // Apply filters
      let filteredTasks = response.tasks;
      
      if (categoryValue !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.category === categoryValue);
      }
      
      if (statusValue !== 'all') {
        const now = new Date();
        
        if (statusValue === 'completed') {
          filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (statusValue === 'pending') {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (statusValue === 'overdue') {
          filteredTasks = filteredTasks.filter(task => {
            if (task.completed) return false;
            
            const taskDateTime = new Date(`${task.dueDate}T${task.time}`);
            return taskDateTime < now;
          });
        }
      }
      
      // Sort tasks by date and time
      filteredTasks.sort((a, b) => {
        const dateA = new Date(`${a.dueDate}T${a.time}`);
        const dateB = new Date(`${b.dueDate}T${b.time}`);
        return dateA - dateB;
      });
      
      // Display filtered tasks
      filteredTasks.forEach(function(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Check if task is overdue
        const taskDateTime = new Date(`${task.dueDate}T${task.time}`);
        const isOverdue = !task.completed && taskDateTime < new Date();
        
        if (isOverdue) {
          taskElement.classList.add('overdue');
        }
        
        // Format date for display
        const formattedDate = new Date(task.dueDate).toLocaleDateString();
        
        // Create task content
        taskElement.innerHTML = `
          <div class="task-content">
            <div class="task-header">
              <span class="task-category">${task.category || 'General'}</span>
              <span class="task-time">${task.time}</span>
            </div>
            <div class="task-text">${task.task}</div>
            <div class="task-date">Due: ${formattedDate}</div>
            <div class="task-status">${task.completed ? 'Completed' : (isOverdue ? 'Overdue' : 'Pending')}</div>
          </div>
          <div class="task-actions">
            <button class="complete-btn" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
              ${task.completed ? 'Undo' : 'Done'}
            </button>
            <button class="delete-btn" title="Delete">Delete</button>
          </div>
        `;
        
        // Add event listeners for buttons
        const completeBtn = taskElement.querySelector('.complete-btn');
        completeBtn.addEventListener('click', function() {
          toggleTaskComplete(task.id, !task.completed);
        });
        
        const deleteBtn = taskElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
          if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(task.id);
          }
        });
        
        tasksContainer.appendChild(taskElement);
      });
      
      // Show message if no tasks match filters
      if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = '<div class="no-tasks">No tasks match your filters</div>';
      }
    });
  }
  
  // Initial display of tasks
  displayTasks();
});
