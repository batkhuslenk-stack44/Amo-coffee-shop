document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Failed', err));
    }

    // UI Elements
    const qtyInputsContainer = document.getElementById('menu-grid');
    const totalPriceElement = document.getElementById('total-price');
    const addItemBtn = document.getElementById('add-item-btn');
    const newItemNameInput = document.getElementById('new-item-name');
    const newItemPriceInput = document.getElementById('new-item-price');
    const newItemImageInput = document.getElementById('new-item-image');
    const imagePreview = document.getElementById('image-preview');

    // Management Modal Elements
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const editNameInput = document.getElementById('edit-name');
    const editPriceInput = document.getElementById('edit-price');
    const editImageInput = document.getElementById('edit-image');
    const editPreviewBox = document.getElementById('edit-preview');
    const saveEditBtn = document.getElementById('save-edit-btn');

    // Admin Access Elements
    const loginModal = document.getElementById('login-modal');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const adminPasswordInput = document.getElementById('admin-password');
    const submitLoginBtn = document.getElementById('submit-login-btn');
    const installPwaBtn = document.getElementById('install-pwa-btn');

    // State
    const ADMIN_PASSWORD = "admin123";
    let isAdmin = localStorage.getItem('coffeeShopAdmin') === 'true';
    let selectedImageData = null;
    let editImageData = null;
    let currentEditingIndex = -1;
    let deferredPrompt = null;

    const DEFAULT_MENU = [
        { name: "Espresso", price: 5000, image: "https://images.unsplash.com/photo-1510707577719-af7c183a14df?q=80&w=400" },
        { name: "Caramel Latte", price: 8000, image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=400" },
        { name: "Cappuccino", price: 7500, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=400" },
        { name: "Americano", price: 6000, image: "https://images.unsplash.com/photo-1551033406-611cf9a28f67?q=80&w=400" },
        { name: "Cheesecake", price: 12000, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=400" },
        { name: "Croissant", price: 4500, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400" }
    ];

    let coffeeMenu = JSON.parse(localStorage.getItem('coffeeShopMenuV2'));
    if (!coffeeMenu) {
        coffeeMenu = DEFAULT_MENU;
        localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
    }

    // Logic Functions
    function setAdminMode(admin) {
        isAdmin = admin;
        localStorage.setItem('coffeeShopAdmin', admin);
        if (admin) {
            document.body.classList.add('admin-mode');
            adminLoginBtn.style.display = 'none';
        } else {
            document.body.classList.remove('admin-mode');
            adminLoginBtn.style.display = 'block';
        }
    }

    function toggleMinusVisibility(qtyInput, minusBtn) {
        if (parseInt(qtyInput.value) > 0) {
            minusBtn.classList.add('visible');
        } else {
            minusBtn.classList.remove('visible');
        }
    }

    function calculateTotal() {
        let total = 0;
        const allQtyInputs = document.querySelectorAll('.qty-input');

        allQtyInputs.forEach((input, index) => {
            const quantity = parseInt(input.value) || 0;
            const menuItem = input.closest('.menu-item');
            const price = parseInt(menuItem.getAttribute('data-price'));
            const minusBtn = menuItem.querySelector('.minus-btn');

            // Find the item in our data array to update it
            const itemIndex = input.dataset.index;
            if (coffeeMenu[itemIndex]) {
                coffeeMenu[itemIndex].quantity = quantity;
            }

            if (quantity > 0) {
                total += quantity * price;
                menuItem.classList.add('active-item');
            } else {
                menuItem.classList.remove('active-item');
            }
            if (minusBtn) toggleMinusVisibility(input, minusBtn);
        });

        // Save updated quantities to localStorage
        localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
        totalPriceElement.textContent = total.toLocaleString() + '₮';
    }

    function handleImage(input, preview, callback) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target.result;
                preview.style.backgroundImage = `url(${data})`;
                preview.style.display = 'block';
                callback(data);
            };
            reader.readAsDataURL(file);
        }
    }

    function createItemElement(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.setAttribute('data-price', item.price);
        // Use persisted quantity if it exists, otherwise 0
        const currentQty = item.quantity || 0;

        itemDiv.innerHTML = `
            <button class="edit-btn admin-only" title="Edit Item">
                <svg viewBox="0 0 576 512"><path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10.3-3.8 14.1 0zm161-27.3l-35.2-35.2c-27.3-27.3-71.7-27.3-99 0L396.9 53.2c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l32.5-32.5c27.3-27.3 27.3-71.7 0-99zM88 424h48v36.3l-64.5 7.2-5.2-5.2c-12.5-12.5-12.5-32.8 0-45.3l4.7-4.7c12.5-12.5 32.8-12.5 45.3 0l5.2 5.2 36.5 4.1L88 424z"/></svg>
            </button>
            <button class="delete-btn admin-only" title="Delete Item">
                <svg viewBox="0 0 448 512"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V400c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V400c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V400c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/></svg>
            </button>
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="item-content">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="price">${parseInt(item.price).toLocaleString()}₮</p>
                </div>
                <div class="item-control">
                    <label>Qty:</label>
                    <div class="qty-wrapper">
                        <button class="minus-btn" title="Decrease">—</button>
                        <input type="number" min="0" value="${currentQty}" class="qty-input" data-index="${index}">
                    </div>
                </div>
            </div>
        `;

        const qtyInput = itemDiv.querySelector('.qty-input');
        const minusBtn = itemDiv.querySelector('.minus-btn');

        itemDiv.addEventListener('click', (e) => {
            if (e.target.closest('.qty-wrapper') || e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;
            qtyInput.value = parseInt(qtyInput.value || 0) + 1;
            calculateTotal();
        });

        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = parseInt(qtyInput.value || 0);
            if (val > 0) {
                qtyInput.value = val - 1;
                calculateTotal();
            }
        });

        qtyInput.addEventListener('input', calculateTotal);

        itemDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Remove ${item.name}?`)) {
                coffeeMenu.splice(index, 1);
                localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
                renderMenu();
                calculateTotal();
            }
        });

        itemDiv.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(index);
        });

        return itemDiv;
    }

    function renderMenu() {
        qtyInputsContainer.innerHTML = '';
        coffeeMenu.forEach((item, index) => {
            qtyInputsContainer.appendChild(createItemElement(item, index));
        });
        calculateTotal(); // Ensure UI state (active items/total) is correct after render
    }

    function openEditModal(index) {
        currentEditingIndex = index;
        const item = coffeeMenu[index];
        editNameInput.value = item.name;
        editPriceInput.value = item.price;
        editPreviewBox.style.backgroundImage = `url(${item.image})`;
        editPreviewBox.style.display = 'block';
        editImageData = item.image;
        editModal.classList.add('active');
    }

    // Event Listeners
    adminLoginBtn.addEventListener('click', () => loginModal.classList.add('active'));
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.remove('active'));
    adminLogoutBtn.addEventListener('click', () => setAdminMode(false));

    submitLoginBtn.addEventListener('click', () => {
        if (adminPasswordInput.value === ADMIN_PASSWORD) {
            setAdminMode(true);
            loginModal.classList.remove('active');
            adminPasswordInput.value = '';
        } else {
            alert('Wrong password!');
        }
    });

    closeModalBtn.addEventListener('click', () => editModal.classList.remove('active'));

    window.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.classList.remove('active');
        if (e.target === loginModal) loginModal.classList.remove('active');
    });

    newItemImageInput.addEventListener('change', () => handleImage(newItemImageInput, imagePreview, (d) => selectedImageData = d));
    editImageInput.addEventListener('change', () => handleImage(editImageInput, editPreviewBox, (d) => editImageData = d));

    saveEditBtn.addEventListener('click', () => {
        const name = editNameInput.value.trim();
        const price = editPriceInput.value.trim();
        if (name && price) {
            // Keep the quantity when editing
            const currentQty = coffeeMenu[currentEditingIndex].quantity || 0;
            coffeeMenu[currentEditingIndex] = { name, price, image: editImageData, quantity: currentQty };
            localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
            renderMenu();
            editModal.classList.remove('active');
        }
    });

    addItemBtn.addEventListener('click', () => {
        const name = newItemNameInput.value.trim();
        const price = newItemPriceInput.value.trim();
        if (name && price) {
            coffeeMenu.push({ name, price, image: selectedImageData || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400", quantity: 0 });
            localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
            renderMenu();
            newItemNameInput.value = '';
            newItemPriceInput.value = '';
            imagePreview.style.display = 'none';
            selectedImageData = null;
        } else alert('Enter name and price!');
    });

    // Handle "Place Order" to reset quantities
    const orderBtn = document.querySelector('.order-btn');
    if (orderBtn) {
        orderBtn.addEventListener('click', () => {
            if (confirm('Confirm order and reset quantities?')) {
                coffeeMenu.forEach(item => item.quantity = 0);
                localStorage.setItem('coffeeShopMenuV2', JSON.stringify(coffeeMenu));
                renderMenu();
                alert('Order placed! Thank you! ☕');
            }
        });
    }

    // PWA Install Logic
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt event fired! Browser is ready to install.');
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can add to home screen
        if (installPwaBtn) {
            console.log('Showing install button now...');
            installPwaBtn.style.display = 'block';
        }
    });

    if (installPwaBtn) {
        installPwaBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
                // Hide the install button
                installPwaBtn.style.display = 'none';
            }
        });
    }

    window.addEventListener('appinstalled', (evt) => {
        console.log('App installed successfully');
        if (installPwaBtn) installPwaBtn.style.display = 'none';
    });

    // Initial load
    setAdminMode(isAdmin);
    renderMenu();
});
