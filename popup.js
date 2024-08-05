document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('todoForm');
  const taskInput = document.getElementById('taskInput');
  const taskTime = document.getElementById('taskTime');
  const tasksContainer = document.getElementById('tasks');

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    const task = taskInput.value;
    const time = taskTime.value;
    saveTask(task, time);
    displayTasks();
    form.reset();
  });

  function saveTask(task, time) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.push({ id: Date.now(), task, time });
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function deleteTask(taskId) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks = tasks.filter(task => task.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    displayTasks();
  }

  function displayTasks() {
    tasksContainer.innerHTML = '';
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.forEach(function(task) {
      const taskElement = document.createElement('div');
      taskElement.textContent = `${task.task} - ${task.time}`;
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', function() {
        deleteTask(task.id);
      });
      taskElement.appendChild(deleteButton);
      tasksContainer.appendChild(taskElement);
    });
  }

  displayTasks();
});
