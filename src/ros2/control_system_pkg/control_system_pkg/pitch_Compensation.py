import matplotlib.pyplot as plt
import numpy as np

# R = sqrt(x^2 + y^2)
# angle of R with x-axis = theta = atan(y/x)
# theta = atan(y/x)
x = 0.3
z = 0.3
theta = np.arctan2(z, x)
theta = np.rad2deg(theta)
R = np.sqrt(x**2 + z**2)
# print(f"R = {R}, theta = {theta}")

pitch = -30  # pitch in degrees
compensated_x = R * np.cos(np.deg2rad(theta - pitch))
compensated_z = R * np.sin(np.deg2rad(theta - pitch))

print(f"Original x = {x}, Original z = {z} R = {R} theta = {theta}")
print(f"Pitch = {pitch}")
print(f"Compensated x = {compensated_x}, Compensated z = {compensated_z} R = {np.sqrt(compensated_x**2 + compensated_z**2)} theta = {np.rad2deg(np.arctan2(compensated_z, compensated_x))}")


# Plotting R with degree theta drawn
fig, ax = plt.subplots()
ax.plot([0, x], [0, z], 'r-', label='R vector')
ax.plot([0, x], [0, 0], 'g-', label='X-axis')
ax.plot([x, x], [0, z], 'b-', label='z-axis')
ax.set_aspect('equal')

# Plotting compensated R with degree theta + pitch drawn
ax.plot([0, compensated_x], [0, compensated_z], 'r--', label='Compensated R vector')
ax.plot([0, compensated_x], [0, 0], 'g--', label='Compensated X-axis')
ax.plot([compensated_x, compensated_x], [0, compensated_z], 'b--', label='Compensated z-axis')


plt.legend()
plt.show()
