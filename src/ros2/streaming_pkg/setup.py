from setuptools import find_packages, setup

package_name = 'streaming_pkg'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='edwin',
    maintainer_email='polyu.eec@gmail.com',
    description='TODO: Package description',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'send_image = streaming_pkg.opencv:main',
            'receive_image = streaming_pkg.opencvbridged:main',
            'capture_image = streaming_pkg.image_capture:main', # Renamed from capture_image for consistency
            'save_image = streaming_pkg.image_saver:main', # Add the new node
        ],
    },
)
