<form role="form" class="internalnotes-settings">
	<div class="row">
		<div class="col-sm-2 col-xs-12 settings-header">
			<h4>Internal Notes &amp; Assignments</h4>
		</div>
		<div class="col-sm-10 col-xs-12">
			<div class="alert alert-info">
				<p>
					This plugin allows moderators and administrators to add private internal notes to any topic.
					Notes and assignments are only visible to users with the required privilege level &mdash;
					they are completely invisible to everyone else.
				</p>
				<p class="mb-0">
					Topics can be assigned to individual users or entire groups. The assigned user or group
					members will receive a notification.
				</p>
			</div>
			<div class="mb-3">
				<div class="form-check">
					<input type="checkbox" class="form-check-input" id="allowCategoryMods" name="allowCategoryMods" />
					<label class="form-check-label" for="allowCategoryMods">
						Allow category moderators to view and manage internal notes (in addition to admins &amp; global moderators)
					</label>
				</div>
			</div>
		</div>
	</div>
	<hr/>
	<div class="row">
		<div class="col-sm-2 col-xs-12"></div>
		<div class="col-sm-10 col-xs-12">
			<button id="save" class="btn btn-primary btn-sm fw-semibold ff-secondary w-100 text-center text-nowrap">Save changes</button>
		</div>
	</div>
</form>
