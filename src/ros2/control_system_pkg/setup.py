from setuptools import find_packages, setup

package_name = 'control_system_pkg'

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
    maintainer='auv-station',
    maintainer_email='20051119d@connect.polyu.hk',
    description='TODO: Package description',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'pid_system_node = control_system_pkg.pid_system:main',
            'msg_converter = control_system_pkg.msg_converter:main',
        ],
    },
)
