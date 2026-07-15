param([string]$FilePath)

$content = Get-Content -Path $FilePath -Raw

# Cancel button
$content = $content.Replace('Cancel', '{t(''common.cancel'')}')

# Create Role
$content = $content.Replace('Create Role', '{t(''roles.createRole'')}')

# Add Role
$content = $content.Replace('Add Role', '{t(''roles.addRole'')}')

# Reset button
$content = $content.Replace('Reset', '{t(''common.reset'')}')

# Save Changes
$content = $content.Replace('Save Changes', '{t(''common.saveChanges'')}')

# Select a role to manage permissions
$content = $content.Replace('Select a role to manage permissions', '{t(''roles.selectRole'')}')

# User Permission Overrides (heading)
$content = $content.Replace('User Permission Overrides', '{t(''roles.userOverridesTitle'')}')

# Grant or deny
$content = $content.Replace('Grant or deny specific permissions to individual users', '{t(''roles.userOverridesDesc'')}')

# Clear button
$content = $content.Replace('Clear', '{t(''common.clear'')}')

Set-Content -Path $FilePath -Value $content -NoNewline
Write-Host "Done"
