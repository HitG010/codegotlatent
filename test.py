import numpy as np
import matplotlib.pyplot as plt

# Parameters
K = 40  # K-factor
N = 5  # Number of participants
mu = 1800  # Average rating (contest participants' mean rating)
sigma = 300  # Standard deviation (scaling constant)

# Sample data: participants' predicted ratings and actual ranks
R = np.array([1700, 1850, 2000, 1600, 1900])  # Predicted ratings
rank = np.array([3, 2, 1, 4, 5])  # Actual ranks (1 = top performer)

# Calculate Expected Score (E) and Actual Score (S)
E = (N - rank) / (N - 1)  # Expected score based on rank
S = (N - rank) / (N - 1)  # Actual score (same here for simplicity)

# Calculate Base Rating Delta (Unscaled)
delta_base = K * (E - S) / (N - 1)

# Calculate the Scale Factor based on rating deviation from average
scale_factor = 1 / (1 + ((R - mu) / sigma) ** 2)

# Calculate the Scaled Rating Delta
delta_scaled = delta_base * scale_factor

# Calculate the Total Rating Delta for Adjustment (to keep the system zero-sum)
total_delta = np.sum(delta_scaled)
adjustment = -total_delta / N

# Final Rating Delta after Adjustment
delta_final = delta_scaled + adjustment

# Clip the Rating Delta to prevent large changes
delta_clipped = np.clip(delta_final, -150, 150)

# Calculate New Ratings
R_new = np.maximum(0, R + delta_clipped)  # Ensure no negative ratings

# Plotting Results
fig, ax = plt.subplots(3, 1, figsize=(10, 12))

# Plot 1: Base Delta vs Scaled Delta
ax[0].bar(range(N), delta_base, label='Base Delta', alpha=0.7, color='blue')
ax[0].bar(range(N), delta_scaled, label='Scaled Delta', alpha=0.7, color='orange')
ax[0].set_xticks(range(N))
ax[0].set_xticklabels([f"User {i+1}" for i in range(N)])
ax[0].set_title('Base vs Scaled Delta (Before Adjustment)')
ax[0].legend()

# Plot 2: Final Delta after Adjustment
ax[1].bar(range(N), delta_final, label='Final Delta (With Adjustment)', alpha=0.7, color='green')
ax[1].set_xticks(range(N))
ax[1].set_xticklabels([f"User {i+1}" for i in range(N)])
ax[1].set_title('Final Delta after Adjustment')
ax[1].legend()

# Plot 3: Clipped Rating Changes
ax[2].bar(range(N), delta_clipped, label='Clipped Delta', alpha=0.7, color='red')
ax[2].set_xticks(range(N))
ax[2].set_xticklabels([f"User {i+1}" for i in range(N)])
ax[2].set_title('Clipped Rating Change')
ax[2].legend()

# Labels and Title for all plots
for axes in ax:
    axes.set_ylabel('Rating Change')
    axes.grid(True)

plt.tight_layout()
plt.show()

# Output the results
print(f"Predicted Ratings: {R}")
print(f"Base Rating Delta (Unscaled): {delta_base}")
print(f"Scaled Rating Delta: {delta_scaled}")
print(f"Final Rating Delta (Adjusted): {delta_final}")
print(f"Clipped Rating Change: {delta_clipped}")
print(f"New Ratings: {R_new}")
