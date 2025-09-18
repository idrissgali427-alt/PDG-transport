document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const currentSectionTitle = document.getElementById('currentSectionTitle');
    const accountantNameInput = document.getElementById('accountantName');

    // --- Global Data Storage (for client-side demo) ---
    // In a real application, this data would come from a backend database.
    let registeredBuses = JSON.parse(localStorage.getItem('registeredBuses')) || [];
    let monthlyVersements = JSON.parse(localStorage.getItem('monthlyVersements')) || [];
    let employees = JSON.parse(localStorage.getItem('employees')) || [];

    // --- Helper Functions ---

    function saveToLocalStorage() {
        localStorage.setItem('registeredBuses', JSON.stringify(registeredBuses));
        localStorage.setItem('monthlyVersements', JSON.stringify(monthlyVersements));
        localStorage.setItem('employees', JSON.stringify(employees));
    }

    function formatCurrency(amount) {
        return `${amount.toLocaleString('fr-FR')} XAF`;
    }

    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
        document.getElementById('current-datetime').textContent = now.toLocaleDateString('fr-FR', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second

    function updateAccountantNameFields(name) {
        document.getElementById('comptableForm').value = name;
        document.getElementById('comptableVersement').value = name;
        // Add other fields if needed
    }

    accountantNameInput.addEventListener('input', (event) => {
        updateAccountantNameFields(event.target.value);
    });

    // --- Navigation Logic ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links and hide all sections
            navLinks.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));

            // Add active class to the clicked link
            link.classList.add('active');

            // Show the corresponding section
            const targetSectionId = link.dataset.section;
            document.getElementById(targetSectionId).classList.add('active');

            // Update header title
            currentSectionTitle.textContent = link.textContent.trim();

            // Perform specific actions when a section is shown
            if (targetSectionId === 'tableau-bord-dashboard') {
                updateDashboardMetrics();
                renderSummaryChart();
            } else if (targetSectionId === 'formulaire-entreprise') {
                loadRegisteredBuses();
            } else if (targetSectionId === 'versement-mensuel') {
                populateChauffeurSelects();
                loadMonthlyVersements();
                document.getElementById('dateVersement').valueAsDate = new Date(); // Set default date
            } else if (targetSectionId === 'bilan-mensuel-dashboard') {
                populateBilanTypeEntrepriseSelect();
                document.getElementById('bilanMois').value = (new Date().getMonth() + 1).toString();
                document.getElementById('bilanAnnee').value = new Date().getFullYear().toString();
                // No auto-generate, user clicks button
            } else if (targetSectionId === 'rapport-global') {
                document.getElementById('rapportMois').value = (new Date().getMonth() + 1).toString();
                document.getElementById('rapportAnnee').value = new Date().getFullYear().toString();
                // No auto-generate, user clicks button
            } else if (targetSectionId === 'section-chauffeur') {
                populateChauffeurInfoSelect();
                document.getElementById('chauffeurMois').value = (new Date().getMonth() + 1).toString();
                document.getElementById('chauffeurAnnee').value = new Date().getFullYear().toString();
            } else if (targetSectionId === 'section-employes') {
                populateEmployeeChauffeurSelect();
                loadEmployees();
            } else if (targetSectionId === 'section-benefice') {
                document.getElementById('beneficeMois').value = (new Date().getMonth() + 1).toString();
                document.getElementById('beneficeAnnee').value = new Date().getFullYear().toString();
            } else if (targetSectionId === 'conseils-section') {
                // Initial load for conseils section
                renderConseilsChart();
                // Also, ensure the placeholder text is visible until the button is clicked
                const adviceContentDiv = document.getElementById('conseils-section').querySelector('.advice-content');
                if (adviceContentDiv) {
                    adviceContentDiv.innerHTML = '<p>Cliquez sur "Générer Conseils" pour voir les insights.</p>';
                }
            }
        });
    });

    // --- Dashboard Metrics ---
    let summaryChartInstance;
    function updateDashboardMetrics() {
        const totalAchats = monthlyVersements.reduce((sum, v) => sum + (parseFloat(v.montantChauffeur) || 0), 0);
        const totalProduction = monthlyVersements.reduce((sum, v) => sum + (parseFloat(v.montantControleur) || 0), 0);
        const totalDepot = totalAchats + totalProduction;

        document.getElementById('totalAchats').textContent = formatCurrency(totalAchats);
        document.getElementById('totalProduction').textContent = formatCurrency(totalProduction);
        document.getElementById('totalDepotDashboard').textContent = formatCurrency(totalDepot);

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentMonthVersements = monthlyVersements.filter(v => {
            const date = new Date(v.dateVersement);
            return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, v) => sum + (parseFloat(v.montantTotal) || 0), 0);
        document.getElementById('bilanVersementsMensuelActuel').textContent = formatCurrency(currentMonthVersements);
    }

    function renderSummaryChart() {
        const ctx = document.getElementById('summaryChart').getContext('2d');

        // Aggregate data by month for the chart
        const monthlyData = {};
        monthlyVersements.forEach(v => {
            const date = new Date(v.dateVersement);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }
            monthlyData[monthYear] += parseFloat(v.montantTotal) || 0;
        });

        const labels = Object.keys(monthlyData).sort();
        const data = labels.map(label => monthlyData[label]);

        if (summaryChartInstance) {
            summaryChartInstance.destroy(); // Destroy previous instance if it exists
        }

        summaryChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total des Dépôts Mensuels',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Enregistrer Bus Section ---
    const formulaireEntrepriseForm = document.getElementById('formulaireEntrepriseForm');
    const tableEntrepriseBody = document.getElementById('table-formulaire-entreprise-body');
    const cancelEntrepriseEditBtn = document.getElementById('cancelEntrepriseEdit');
    let currentEntrepriseEditId = null;

    function loadRegisteredBuses() {
        tableEntrepriseBody.innerHTML = '';
        registeredBuses.forEach(bus => {
            const row = tableEntrepriseBody.insertRow();
            row.innerHTML = `
                <td>${bus.id}</td>
                <td>${bus.type}</td>
                <td>${bus.chauffeur}</td>
                <td>${bus.controleur}</td>
                <td>${bus.matriculation}</td>
                <td>${bus.dateEnregistrement}</td>
                <td>${bus.comptable}</td>
                <td>
                    <button class="btn btn-sm btn-edit" data-id="${bus.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-delete" data-id="${bus.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
        attachEntrepriseTableEvents();
    }

    function attachEntrepriseTableEvents() {
        tableEntrepriseBody.querySelectorAll('.btn-edit').forEach(button => {
            button.onclick = (e) => editEntreprise(e.currentTarget.dataset.id);
        });
        tableEntrepriseBody.querySelectorAll('.btn-delete').forEach(button => {
            button.onclick = (e) => deleteEntreprise(e.currentTarget.dataset.id);
        });
    }

    formulaireEntrepriseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBus = {
            type: document.getElementById('typeEntrepriseForm').value,
            chauffeur: document.getElementById('dgForm').value,
            controleur: document.getElementById('controleurForm').value,
            matriculation: document.getElementById('matriculationForm').value,
            dateEnregistrement: document.getElementById('dateForm').value,
            comptable: document.getElementById('comptableForm').value
        };

        if (currentEntrepriseEditId) {
            // Edit existing bus
            const index = registeredBuses.findIndex(bus => bus.id == currentEntrepriseEditId);
            if (index !== -1) {
                registeredBuses[index] = { ...newBus, id: currentEntrepriseEditId };
                alert('Bus modifié avec succès!');
            }
            currentEntrepriseEditId = null;
            formulaireEntrepriseForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Bus';
            cancelEntrepriseEditBtn.style.display = 'none';
        } else {
            // Add new bus
            newBus.id = registeredBuses.length ? Math.max(...registeredBuses.map(b => b.id)) + 1 : 1;
            registeredBuses.push(newBus);
            alert('Bus enregistré avec succès!');
        }
        saveToLocalStorage();
        loadRegisteredBuses();
        formulaireEntrepriseForm.reset();
        populateChauffeurSelects(); // Update dropdowns if new chauffeur added
        populateBilanTypeEntrepriseSelect();
        populateEmployeeChauffeurSelect();
        populateChauffeurInfoSelect();
    });

    function editEntreprise(id) {
        const busToEdit = registeredBuses.find(bus => bus.id == id);
        if (busToEdit) {
            document.getElementById('typeEntrepriseForm').value = busToEdit.type;
            document.getElementById('dgForm').value = busToEdit.chauffeur;
            document.getElementById('controleurForm').value = busToEdit.controleur;
            document.getElementById('matriculationForm').value = busToEdit.matriculation;
            document.getElementById('dateForm').value = busToEdit.dateEnregistrement;
            document.getElementById('comptableForm').value = busToEdit.comptable;

            currentEntrepriseEditId = id;
            formulaireEntrepriseForm.querySelector('button[type="submit"]').textContent = 'Mettre à jour Bus';
            cancelEntrepriseEditBtn.style.display = 'inline-block';
        }
    }

    cancelEntrepriseEditBtn.addEventListener('click', () => {
        formulaireEntrepriseForm.reset();
        currentEntrepriseEditId = null;
        formulaireEntrepriseForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Bus';
        cancelEntrepriseEditBtn.style.display = 'none';
    });

    function deleteEntreprise(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce bus?')) {
            registeredBuses = registeredBuses.filter(bus => bus.id != id);
            // Also remove any related employees and payments for data consistency
            employees = employees.filter(emp => emp.busId != id);
            monthlyVersements = monthlyVersements.filter(v => v.rapportBusId != id);

            saveToLocalStorage();
            loadRegisteredBuses();
            alert('Bus supprimé avec succès!');
            populateChauffeurSelects(); // Update dropdowns
            populateBilanTypeEntrepriseSelect();
            populateEmployeeChauffeurSelect();
            populateChauffeurInfoSelect();
            loadMonthlyVersements(); // Refresh payments as some might be deleted
            loadEmployees(); // Refresh employees as some might be deleted
        }
    }

    // --- Versement Mensuel Section ---
    const versementMensuelForm = document.getElementById('versementMensuelForm');
    const selectChauffeurVersement = document.getElementById('selectChauffeurVersement');
    const tableVersementMensuelBody = document.getElementById('table-versement-mensuel-body');
    const caAchatInput = document.getElementById('caAchat');
    const caProductionInput = document.getElementById('caProduction');
    const montantDepotInput = document.getElementById('montantDepot');
    const cancelVersementEditBtn = document.getElementById('cancelVersementEdit');
    let currentVersementEditId = null;

    function populateChauffeurSelects() {
        selectChauffeurVersement.innerHTML = '<option value="">Sélectionner un chauffeur</option>';
        registeredBuses.forEach(bus => {
            const option = document.createElement('option');
            option.value = bus.id; // Use bus ID as value
            option.textContent = bus.chauffeur;
            selectChauffeurVersement.appendChild(option);
        });
        populateChauffeurInfoSelect(); // For chauffeur info section
        populateEmployeeChauffeurSelect(); // For employee section
    }

    selectChauffeurVersement.addEventListener('change', (e) => {
        const selectedBusId = e.target.value;
        const selectedBus = registeredBuses.find(bus => bus.id == selectedBusId);
        if (selectedBus) {
            document.getElementById('rapportEntreprise').value = selectedBus.id;
            document.getElementById('typeEntrepriseVersement').value = selectedBus.type;
            document.getElementById('controleurVersement').value = selectedBus.controleur;
            document.getElementById('matriculationVersement').value = selectedBus.matriculation;
        } else {
            document.getElementById('rapportEntreprise').value = '';
            document.getElementById('typeEntrepriseVersement').value = '';
            document.getElementById('controleurVersement').value = '';
            document.getElementById('matriculationVersement').value = '';
        }
    });

    caAchatInput.addEventListener('input', updateMontantDepot);
    caProductionInput.addEventListener('input', updateMontantDepot);

    function updateMontantDepot() {
        const caAchat = parseFloat(caAchatInput.value) || 0;
        const caProduction = parseFloat(caProductionInput.value) || 0;
        const total = caAchat + caProduction;
        montantDepotInput.value = formatCurrency(total);
    }

    function loadMonthlyVersements() {
        tableVersementMensuelBody.innerHTML = '';
        monthlyVersements.forEach(versement => {
            const row = tableVersementMensuelBody.insertRow();
            row.innerHTML = `
                <td>${versement.rapportBusId}</td>
                <td>${versement.typeBus}</td>
                <td>${versement.chauffeurName}</td>
                <td>${versement.controleurName}</td>
                <td>${versement.matriculation}</td>
                <td>${versement.comptable}</td>
                <td>${versement.dateVersement}</td>
                <td>${formatCurrency(versement.montantChauffeur)}</td>
                <td>${formatCurrency(versement.montantControleur)}</td>
                <td>${formatCurrency(versement.montantTotal)}</td>
                <td>
                    <button class="btn btn-sm btn-edit-versement" data-id="${versement.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-delete-versement" data-id="${versement.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
        attachVersementTableEvents();
    }

    function attachVersementTableEvents() {
        tableVersementMensuelBody.querySelectorAll('.btn-edit-versement').forEach(button => {
            button.onclick = (e) => editVersement(e.currentTarget.dataset.id);
        });
        tableVersementMensuelBody.querySelectorAll('.btn-delete-versement').forEach(button => {
            button.onclick = (e) => deleteVersement(e.currentTarget.dataset.id);
        });
    }

    versementMensuelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedBusId = selectChauffeurVersement.value;
        const selectedBus = registeredBuses.find(bus => bus.id == selectedBusId);

        if (!selectedBus) {
            alert('Veuillez sélectionner un chauffeur valide.');
            return;
        }

        const newVersement = {
            rapportBusId: selectedBus.id,
            typeBus: selectedBus.type,
            chauffeurName: selectedBus.chauffeur,
            controleurName: selectedBus.controleur,
            matriculation: selectedBus.matriculation,
            dateVersement: document.getElementById('dateVersement').value,
            montantChauffeur: parseFloat(caAchatInput.value) || 0,
            montantControleur: parseFloat(caProductionInput.value) || 0,
            montantTotal: (parseFloat(caAchatInput.value) || 0) + (parseFloat(caProductionInput.value) || 0),
            comptable: document.getElementById('comptableVersement').value
        };

        if (currentVersementEditId) {
            const index = monthlyVersements.findIndex(v => v.id == currentVersementEditId);
            if (index !== -1) {
                monthlyVersements[index] = { ...newVersement, id: currentVersementEditId };
                alert('Versement modifié avec succès!');
            }
            currentVersementEditId = null;
            versementMensuelForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Versement';
            cancelVersementEditBtn.style.display = 'none';
        } else {
            newVersement.id = monthlyVersements.length ? Math.max(...monthlyVersements.map(v => v.id)) + 1 : 1;
            monthlyVersements.push(newVersement);
            alert('Versement enregistré avec succès!');
        }
        saveToLocalStorage();
        loadMonthlyVersements();
        versementMensuelForm.reset();
        montantDepotInput.value = '0 XAF'; // Reset total display
        selectChauffeurVersement.value = ''; // Clear selection
        selectChauffeurVersement.dispatchEvent(new Event('change')); // Trigger change to clear related fields
        updateDashboardMetrics(); // Update dashboard after new payment
    });

    function editVersement(id) {
        const versementToEdit = monthlyVersements.find(v => v.id == id);
        if (versementToEdit) {
            selectChauffeurVersement.value = versementToEdit.rapportBusId;
            selectChauffeurVersement.dispatchEvent(new Event('change')); // Trigger change to populate associated fields
            document.getElementById('dateVersement').value = versementToEdit.dateVersement;
            caAchatInput.value = versementToEdit.montantChauffeur;
            caProductionInput.value = versementToEdit.montantControleur;
            updateMontantDepot(); // Recalculate and display total

            currentVersementEditId = id;
            versementMensuelForm.querySelector('button[type="submit"]').textContent = 'Mettre à jour Versement';
            cancelVersementEditBtn.style.display = 'inline-block';
        }
    }

    cancelVersementEditBtn.addEventListener('click', () => {
        versementMensuelForm.reset();
        currentVersementEditId = null;
        versementMensuelForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Versement';
        cancelVersementEditBtn.style.display = 'none';
        montantDepotInput.value = '0 XAF';
        selectChauffeurVersement.value = ''; // Clear selection
        selectChauffeurVersement.dispatchEvent(new Event('change'));
    });

    function deleteVersement(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce versement?')) {
            monthlyVersements = monthlyVersements.filter(v => v.id != id);
            saveToLocalStorage();
            loadMonthlyVersements();
            alert('Versement supprimé avec succès!');
            updateDashboardMetrics(); // Update dashboard after deletion
        }
    }

    // --- Bilan Mensuel Dashboard ---
    const bilanMoisSelect = document.getElementById('bilanMois');
    const bilanAnneeInput = document.getElementById('bilanAnnee');
    const bilanTypeEntrepriseSelect = document.getElementById('bilanTypeEntreprise');
    const genererBilanBtn = document.getElementById('genererBilanBtn');
    const bilanOutput = document.getElementById('bilanOutput');
    const bilanChartContainer = document.getElementById('bilanChartContainer');
    const printBilanBtn = document.getElementById('printBilanBtn');
    let bilanMensuelChartInstance;

    function populateBilanTypeEntrepriseSelect() {
        bilanTypeEntrepriseSelect.innerHTML = '<option value="">Tous les bus</option>';
        const uniqueTypes = [...new Set(registeredBuses.map(bus => bus.type))];
        uniqueTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            bilanTypeEntrepriseSelect.appendChild(option);
        });
    }

    genererBilanBtn.addEventListener('click', () => {
        const mois = parseInt(bilanMoisSelect.value);
        const annee = parseInt(bilanAnneeInput.value);
        const typeFiltre = bilanTypeEntrepriseSelect.value;

        const filteredVersements = monthlyVersements.filter(versement => {
            const date = new Date(versement.dateVersement);
            const versementMois = date.getMonth() + 1;
            const versementAnnee = date.getFullYear();
            const typeMatch = typeFiltre === '' || versement.typeBus === typeFiltre;
            return versementMois === mois && versementAnnee === annee && typeMatch;
        });

        if (filteredVersements.length === 0) {
            bilanOutput.innerHTML = `<p>Aucun versement trouvé pour ${bilanMoisSelect.options[bilanMoisSelect.selectedIndex].text} ${annee} ${typeFiltre ? 'pour le type de bus ' + typeFiltre : ''}.</p>`;
            bilanChartContainer.style.display = 'none';
            printBilanBtn.style.display = 'none';
            return;
        }

        let totalChauffeur = 0;
        let totalControleur = 0;
        let totalGeneral = 0;

        const bilanDetails = filteredVersements.map(v => {
            totalChauffeur += v.montantChauffeur;
            totalControleur += v.montantControleur;
            totalGeneral += v.montantTotal;
            return `
                <tr>
                    <td>${v.dateVersement}</td>
                    <td>${v.chauffeurName}</td>
                    <td>${v.controleurName}</td>
                    <td>${v.matriculation}</td>
                    <td>${formatCurrency(v.montantChauffeur)}</td>
                    <td>${formatCurrency(v.montantControleur)}</td>
                    <td>${formatCurrency(v.montantTotal)}</td>
                </tr>
            `;
        }).join('');

        bilanOutput.innerHTML = `
            <h3>Bilan pour ${bilanMoisSelect.options[bilanMoisSelect.selectedIndex].text} ${annee} ${typeFiltre ? '(Type: ' + typeFiltre + ')' : ''}</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Chauffeur</th>
                            <th>Contrôleur</th>
                            <th>Matriculation</th>
                            <th>M. Chauffeur</th>
                            <th>M. Contrôleur</th>
                            <th>Total Versé</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bilanDetails}
                    </tbody>
                </table>
            </div>
            <p><strong>Total Versements Chauffeurs:</strong> <span class="total-summary">${formatCurrency(totalChauffeur)}</span></p>
            <p><strong>Total Versements Contrôleurs:</strong> <span class="total-summary">${formatCurrency(totalControleur)}</span></p>
            <p><strong>Total Général des Versements:</strong> <span class="total-summary">${formatCurrency(totalGeneral)}</span></p>
        `;
        bilanChartContainer.style.display = 'block';
        printBilanBtn.style.display = 'inline-block';
        renderBilanMensuelChart(filteredVersements);
    });

    function renderBilanMensuelChart(data) {
        const ctx = document.getElementById('bilanMensuelChart').getContext('2d');

        // Aggregate data by day
        const dailyData = {};
        data.forEach(v => {
            const date = v.dateVersement;
            if (!dailyData[date]) {
                dailyData[date] = 0;
            }
            dailyData[date] += parseFloat(v.montantTotal) || 0;
        });

        const labels = Object.keys(dailyData).sort();
        const chartData = labels.map(label => dailyData[label]);

        if (bilanMensuelChartInstance) {
            bilanMensuelChartInstance.destroy();
        }

        bilanMensuelChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Versements Quotidien',
                    data: chartData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    }
                }
            }
        });
    }

    printBilanBtn.addEventListener('click', () => {
        // Simple print functionality
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Bilan Mensuel</title>');
        printWindow.document.write('<link rel="stylesheet" href="style Transport PDG.css">'); // Include your CSS
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h1>Bilan Mensuel GaliBusiness</h1>');
        printWindow.document.write(bilanOutput.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    });


    // --- Rapport Global Section ---
    const rapportMoisSelect = document.getElementById('rapportMois');
    const rapportAnneeInput = document.getElementById('rapportAnnee');
    const genererRapportBtn = document.getElementById('genererRapportBtn');

    genererRapportBtn.addEventListener('click', () => {
        const mois = parseInt(rapportMoisSelect.value);
        const annee = parseInt(rapportAnneeInput.value);

        const filteredVersements = monthlyVersements.filter(versement => {
            const date = new Date(versement.dateVersement);
            return date.getMonth() + 1 === mois && date.getFullYear() === annee;
        });

        const totalGeneralDepots = filteredVersements.reduce((sum, v) => sum + (parseFloat(v.montantTotal) || 0), 0);

        const assurances = totalGeneralDepots * 0.10; // 10%
        const entretien = totalGeneralDepots * 0.03;  // 3%
        const accident = totalGeneralDepots * 0.07;   // 7%
        const montantPreleve = assurances + entretien + accident;
        const montantTotalVerseRestant = totalGeneralDepots - montantPreleve;

        document.getElementById('numeroRapport').textContent = `${mois}/${annee}`;
        document.getElementById('rapportTotalDepot').textContent = formatCurrency(totalGeneralDepots);
        document.getElementById('assurancesMontant').textContent = formatCurrency(assurances);
        document.getElementById('entretienMontant').textContent = formatCurrency(entretien);
        document.getElementById('accidentMontant').textContent = formatCurrency(accident);
        document.getElementById('montantPreleve').textContent = formatCurrency(montantPreleve);
        document.getElementById('montantTotalVerseRestant').textContent = formatCurrency(montantTotalVerseRestant);

        alert('Rapport Global généré. Vous pouvez maintenant l\'imprimer.');
        // For a real print, you'd likely open a new window with a print-friendly view
    });

    // --- Info Chauffeur Section ---
    const chauffeurMoisSelect = document.getElementById('chauffeurMois');
    const chauffeurAnneeInput = document.getElementById('chauffeurAnnee');
    const selectChauffeurInfo = document.getElementById('selectChauffeurInfo');
    const chauffeurControleurInput = document.getElementById('chauffeurControleur');
    const chauffeurTotalVerseInput = document.getElementById('chauffeurTotalVerse');
    const afficherChauffeurInfoBtn = document.getElementById('afficherChauffeurInfoBtn');
    const tableChauffeurVersementsBody = document.getElementById('table-chauffeur-versements-body');

    function populateChauffeurInfoSelect() {
        selectChauffeurInfo.innerHTML = '<option value="">Sélectionnez un chauffeur</option>';
        const uniqueChauffeurs = [...new Set(registeredBuses.map(bus => ({ id: bus.id, name: bus.chauffeur, controleur: bus.controleur })))];
        uniqueChauffeurs.forEach(chauffeur => {
            const option = document.createElement('option');
            option.value = chauffeur.id; // Use bus ID for linkage
            option.textContent = chauffeur.name;
            selectChauffeurInfo.appendChild(option);
        });
    }

    selectChauffeurInfo.addEventListener('change', () => {
        const selectedBusId = selectChauffeurInfo.value;
        const selectedBus = registeredBuses.find(bus => bus.id == selectedBusId);
        if (selectedBus) {
            chauffeurControleurInput.value = selectedBus.controleur;
        } else {
            chauffeurControleurInput.value = '';
        }
        // Don't auto-display total/history, user clicks "Afficher Informations"
    });

    afficherChauffeurInfoBtn.addEventListener('click', () => {
        const selectedBusId = selectChauffeurInfo.value;
        const mois = parseInt(chauffeurMoisSelect.value);
        const annee = parseInt(chauffeurAnneeInput.value);

        if (!selectedBusId) {
            alert('Veuillez sélectionner un chauffeur.');
            return;
        }

        const chauffeurVersements = monthlyVersements.filter(v => {
            const date = new Date(v.dateVersement);
            return v.rapportBusId == selectedBusId &&
                   date.getMonth() + 1 === mois &&
                   date.getFullYear() === annee;
        });

        const totalVerseParChauffeur = chauffeurVersements.reduce((sum, v) => sum + (parseFloat(v.montantChauffeur) || 0), 0);
        chauffeurTotalVerseInput.value = formatCurrency(totalVerseParChauffeur);

        tableChauffeurVersementsBody.innerHTML = '';
        if (chauffeurVersements.length === 0) {
            tableChauffeurVersementsBody.innerHTML = '<tr><td colspan="5">Aucun versement trouvé pour ce chauffeur ce mois-ci.</td></tr>';
        } else {
            chauffeurVersements.forEach(v => {
                const row = tableChauffeurVersementsBody.insertRow();
                row.innerHTML = `
                    <td>${v.dateVersement}</td>
                    <td>${formatCurrency(v.montantChauffeur)}</td>
                    <td>${formatCurrency(v.montantControleur)}</td>
                    <td>${formatCurrency(v.montantTotal)}</td>
                    <td>${v.comptable}</td>
                `;
            });
        }
    });

    // --- Gestion des Employés Section ---
    const employeeForm = document.getElementById('employeeForm');
    const employeeSelectChauffeur = document.getElementById('employeeSelectChauffeur');
    const tableEmployesBody = document.getElementById('table-employes-body');
    const cancelEmployeeEditBtn = document.getElementById('cancelEmployeeEdit');
    const employeePhotoChauffeurInput = document.getElementById('employeePhotoChauffeur');
    const employeePhotoControleurInput = document.getElementById('employeePhotoControleur');
    let currentEmployeeEditId = null;

    function populateEmployeeChauffeurSelect() {
        employeeSelectChauffeur.innerHTML = '<option value="">Sélectionner un chauffeur</option>';
        registeredBuses.forEach(bus => {
            // Only add chauffeurs that are not yet registered as employees or are the one being edited
            const isAlreadyEmployee = employees.some(emp => emp.busId == bus.id && emp.id !== currentEmployeeEditId); // Exclude current edited employee
            if (!isAlreadyEmployee) {
                const option = document.createElement('option');
                option.value = bus.id;
                option.textContent = bus.chauffeur;
                employeeSelectChauffeur.appendChild(option);
            }
        });
    }

    employeeSelectChauffeur.addEventListener('change', () => {
        const selectedBusId = employeeSelectChauffeur.value;
        const selectedBus = registeredBuses.find(bus => bus.id == selectedBusId);
        if (selectedBus) {
            document.getElementById('employeeRapportNumber').value = selectedBus.id;
            document.getElementById('employeeNomControleur').value = selectedBus.controleur;
        } else {
            document.getElementById('employeeRapportNumber').value = '';
            document.getElementById('employeeNomControleur').value = '';
        }
    });

    function loadEmployees() {
        tableEmployesBody.innerHTML = '';
        employees.forEach(emp => {
            const bus = registeredBuses.find(b => b.id == emp.busId);
            const row = tableEmployesBody.insertRow();
            row.innerHTML = `
                <td>${bus ? bus.id : 'N/A'}</td>
                <td>${emp.chauffeurName}</td>
                <td>${emp.controleurName}</td>
                <td>${formatCurrency(emp.salaireChauffeur)}</td>
                <td>${formatCurrency(emp.salaireControleur)}</td>
                <td>${emp.photoChauffeur ? `<img src="${emp.photoChauffeur}" alt="Chauffeur" class="employee-photo">` : 'Aucune photo'}</td>
                <td>${emp.photoControleur ? `<img src="${emp.photoControleur}" alt="Contrôleur" class="employee-photo">` : 'Aucune photo'}</td>
                <td>
                    <button class="btn btn-sm btn-edit-employee" data-id="${emp.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-delete-employee" data-id="${emp.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
        attachEmployeeTableEvents();
    }

    function attachEmployeeTableEvents() {
        tableEmployesBody.querySelectorAll('.btn-edit-employee').forEach(button => {
            button.onclick = (e) => editEmployee(e.currentTarget.dataset.id);
        });
        tableEmployesBody.querySelectorAll('.btn-delete-employee').forEach(button => {
            button.onclick = (e) => deleteEmployee(e.currentTarget.dataset.id);
        });
    }

    // Helper to convert file to base64
    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedBusId = employeeSelectChauffeur.value;
        const selectedBus = registeredBuses.find(bus => bus.id == selectedBusId);

        if (!selectedBus) {
            alert('Veuillez sélectionner un chauffeur valide.');
            return;
        }

        let photoChauffeurBase64 = '';
        if (employeePhotoChauffeurInput.files.length > 0) {
            try {
                photoChauffeurBase64 = await getBase64(employeePhotoChauffeurInput.files[0]);
            } catch (error) {
                console.error("Error reading chauffeur photo:", error);
                alert("Erreur lors du chargement de la photo du chauffeur.");
                return;
            }
        } else if (currentEmployeeEditId) {
            // Keep existing photo if not updated during edit
            const existingEmployee = employees.find(emp => emp.id == currentEmployeeEditId);
            if (existingEmployee) photoChauffeurBase64 = existingEmployee.photoChauffeur;
        }


        let photoControleurBase64 = '';
        if (employeePhotoControleurInput.files.length > 0) {
            try {
                photoControleurBase64 = await getBase64(employeePhotoControleurInput.files[0]);
            } catch (error) {
                console.error("Error reading controleur photo:", error);
                alert("Erreur lors du chargement de la photo du contrôleur.");
                return;
            }
        } else if (currentEmployeeEditId) {
            // Keep existing photo if not updated during edit
            const existingEmployee = employees.find(emp => emp.id == currentEmployeeEditId);
            if (existingEmployee) photoControleurBase64 = existingEmployee.photoControleur;
        }


        const newEmployee = {
            busId: selectedBus.id,
            chauffeurName: selectedBus.chauffeur,
            controleurName: selectedBus.controleur,
            salaireChauffeur: parseFloat(document.getElementById('employeeSalaireChauffeur').value) || 0,
            salaireControleur: parseFloat(document.getElementById('employeeSalaireControleur').value) || 0,
            photoChauffeur: photoChauffeurBase64,
            photoControleur: photoControleurBase64
        };

        if (currentEmployeeEditId) {
            const index = employees.findIndex(emp => emp.id == currentEmployeeEditId);
            if (index !== -1) {
                employees[index] = { ...newEmployee, id: currentEmployeeEditId };
                alert('Employé modifié avec succès!');
            }
            currentEmployeeEditId = null;
            employeeForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Employé';
            cancelEmployeeEditBtn.style.display = 'none';
        } else {
            // Check if chauffeur is already an employee
            const isAlreadyEmployee = employees.some(emp => emp.busId == newEmployee.busId);
            if (isAlreadyEmployee) {
                alert('Ce chauffeur est déjà enregistré comme employé.');
                return;
            }
            newEmployee.id = employees.length ? Math.max(...employees.map(emp => emp.id)) + 1 : 1;
            employees.push(newEmployee);
            alert('Employé enregistré avec succès!');
        }
        saveToLocalStorage();
        loadEmployees();
        employeeForm.reset();
        employeeSelectChauffeur.value = ''; // Clear selection
        employeeSelectChauffeur.dispatchEvent(new Event('change')); // Trigger change to clear related fields
        populateEmployeeChauffeurSelect(); // Refresh available chauffeurs
    });

    function editEmployee(id) {
        const employeeToEdit = employees.find(emp => emp.id == id);
        if (employeeToEdit) {
            currentEmployeeEditId = id;
            // Temporarily add the current employee's chauffeur back to the select if they're editing
            populateEmployeeChauffeurSelect(); // Re-run to include current chauffeur
            employeeSelectChauffeur.value = employeeToEdit.busId;
            employeeSelectChauffeur.dispatchEvent(new Event('change')); // Populate bus info
            document.getElementById('employeeSalaireChauffeur').value = employeeToEdit.salaireChauffeur;
            document.getElementById('employeeSalaireControleur').value = employeeToEdit.salaireControleur;

            // Note: File inputs cannot have their value set directly for security reasons.
            // Users will need to re-select photos if they want to change them.
            // The logic above ensures the existing photo URL is retained if no new file is chosen.

            employeeForm.querySelector('button[type="submit"]').textContent = 'Mettre à jour Employé';
            cancelEmployeeEditBtn.style.display = 'inline-block';
        }
    }

    cancelEmployeeEditBtn.addEventListener('click', () => {
        employeeForm.reset();
        currentEmployeeEditId = null;
        employeeForm.querySelector('button[type="submit"]').textContent = 'Enregistrer Employé';
        cancelEmployeeEditBtn.style.display = 'none';
        employeeSelectChauffeur.value = '';
        employeeSelectChauffeur.dispatchEvent(new Event('change'));
        populateEmployeeChauffeurSelect(); // Re-populate to reflect original state
    });

    function deleteEmployee(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet employé?')) {
            employees = employees.filter(emp => emp.id != id);
            saveToLocalStorage();
            loadEmployees();
            alert('Employé supprimé avec succès!');
            populateEmployeeChauffeurSelect(); // Refresh available chauffeurs
        }
    }

    // --- Bénéfice Section ---
    const calculerBeneficeBtn = document.getElementById('calculerBeneficeBtn');

    calculerBeneficeBtn.addEventListener('click', () => {
        const mois = parseInt(document.getElementById('beneficeMois').value);
        const annee = parseInt(document.getElementById('beneficeAnnee').value);

        // Recalculate 'Montant Total Versé Restant' from Rapport Global for this month/year
        const filteredVersements = monthlyVersements.filter(versement => {
            const date = new Date(versement.dateVersement);
            return date.getMonth() + 1 === mois && date.getFullYear() === annee;
        });
        const totalGeneralDepots = filteredVersements.reduce((sum, v) => sum + (parseFloat(v.montantTotal) || 0), 0);
        const assurances = totalGeneralDepots * 0.10;
        const entretien = totalGeneralDepots * 0.03;
        const accident = totalGeneralDepots * 0.07;
        const montantPreleve = assurances + entretien + accident;
        const montantTotalVerseRestant = totalGeneralDepots - montantPreleve;

        // Calculate total employee salaries for the month
        const totalSalaries = employees.reduce((sum, emp) => sum + emp.salaireChauffeur + emp.salaireControleur, 0);

        const beneficeNet = montantTotalVerseRestant - totalSalaries;
        const beneficeEpargner = beneficeNet * 0.20; // Example: save 20% of net profit

        document.getElementById('beneficeMontantTotalVerseRestant').textContent = formatCurrency(montantTotalVerseRestant);
        document.getElementById('salaireTotal').textContent = formatCurrency(totalSalaries);
        document.getElementById('beneficeNet').textContent = formatCurrency(beneficeNet);
        document.getElementById('beneficeEpargner').value = formatCurrency(beneficeEpargner);
    });

    // --- Conseils Personnalisés Section ---
    const genererConseilsBtn = document.getElementById('genererConseilsBtn');
    let conseilsChartInstance; // To hold the Chart.js instance

    function renderConseilsChart() {
        const ctx = document.getElementById('conseilsChart').getContext('2d');

        // Aggregate data by month for the chart
        const monthlyData = {};
        monthlyVersements.forEach(v => {
            const date = new Date(v.dateVersement);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }
            monthlyData[monthYear] += parseFloat(v.montantTotal) || 0;
        });

        const labels = Object.keys(monthlyData).sort();
        const data = labels.map(label => monthlyData[label]);

        if (conseilsChartInstance) {
            conseilsChartInstance.destroy(); // Destroy previous instance if it exists
        }

        conseilsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Évolution du Total des Dépôts',
                    data: data,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)', // Different color for distinction
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4 // Smooth curve
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Montant Total (XAF)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mois-Année'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('fr-FR') + ' XAF';
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tendance des Versements au Fil du Temps'
                    }
                }
            }
        });
    }

    genererConseilsBtn.addEventListener('click', () => {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Simple example advice based on current month's performance
        const currentMonthVersements = monthlyVersements.filter(v => {
            const date = new Date(v.dateVersement);
            return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, v) => sum + (parseFloat(v.montantTotal) || 0), 0);

        const totalSalariesForAdvice = employees.reduce((sum, emp) => sum + emp.salaireChauffeur + emp.salaireControleur, 0);

        const adviceContentDiv = document.getElementById('conseils-section').querySelector('.advice-content');
        let adviceMessage = `<p><strong>Conseils pour ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}:</strong></p>`;

        if (currentMonthVersements > 500000) { // Example threshold
            adviceMessage += `<p><i class="fas fa-check-circle text-success"></i> Excellente performance ce mois-ci avec ${formatCurrency(currentMonthVersements)} de versements ! Continuez sur cette lancée.</p>`;
        } else if (currentMonthVersements < 200000 && currentMonthVersements > 0) {
            adviceMessage += `<p><i class="fas fa-exclamation-triangle text-warning"></i> Les versements de ce mois (${formatCurrency(currentMonthVersements)}) sont inférieurs à la moyenne. Considérez l'optimisation des trajets ou la motivation des chauffeurs.</p>`;
        } else {
             adviceMessage += `<p><i class="fas fa-info-circle text-info"></i> Pas assez de données de versement pour ce mois pour fournir des conseils précis. Assurez-vous d'enregistrer les versements régulièrement.</p>`;
        }

        if (totalSalariesForAdvice > 0 && currentMonthVersements > 0) {
            const profitMargin = ((currentMonthVersements - totalSalariesForAdvice) / currentMonthVersements) * 100;
            if (profitMargin < 10 && profitMargin > 0) { // Example threshold
                adviceMessage += `<p><i class="fas fa-lightbulb"></i> Votre marge bénéficiaire est de ${profitMargin.toFixed(2)}%. Explorez des moyens de réduire les coûts opérationnels ou d'augmenter les revenus par bus.</p>`;
            } else if (profitMargin <= 0) {
                adviceMessage += `<p><i class="fas fa-times-circle text-danger"></i> Vous enregistrez une perte ce mois-ci. Une analyse immédiate des dépenses et des revenus est cruciale.</p>`;
            }
        } else if (totalSalariesForAdvice > 0 && currentMonthVersements === 0) {
            adviceMessage += `<p><i class="fas fa-times-circle text-danger"></i> Aucun versement enregistré ce mois-ci mais des salaires sont définis. Ceci indique une perte directe. Vérifiez l'activité et les enregistrements.</p>`;
        }

        adviceContentDiv.innerHTML = adviceMessage;
        renderConseilsChart(); // Render/update the chart when advice is generated
    });

    // --- Initial Load ---
    updateDashboardMetrics();
    renderSummaryChart();
    // Default to the first section
    document.querySelector('.nav-link.active').click();
});



//CODE DE PROTECTION





